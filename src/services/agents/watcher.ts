// Watcher agent — poll Gmail, detect replies, classify intent, advance stages, trigger follow-ups
// Also handles meta-inbox (replies to Alma's night preview email)

import { startAgentRun, endAgentRun, askClaudeJSON, logSignal, getAdminClient, nudgePlanner } from "./shared";
import { pollInbox, type InboxMessage } from "@/services/gmail/poll";
import { matchInboundToSentDraft } from "@/services/gmail/thread-match";

export interface WatcherInput {
  userId: string;
  sinceTimestamp?: number; // defaults to last poll time
  maxMessages?: number;
}

export interface WatcherOutput {
  processed: number;
  repliesMatched: number;
  stagesAdvanced: number;
  metaInboxParsed: number;
}

type ReplyIntent =
  | "interested"
  | "polite_no"
  | "request_time"
  | "off_topic"
  | "referral_offer"
  | "decline_remove"
  | "unknown";

interface ClassificationResult {
  intent: ReplyIntent;
  signals: {
    dealsMentioned: string[];
    bankersMentioned: string[];
    proposedTimes: string[];
    referralTargets: string[];
    groupMentions: string[];
  };
  nextStage?: "replied" | "coffee" | "referral" | "closed_lost";
  followUpNeeded: boolean;
}

const CLASSIFY_SYSTEM = `You read incoming email replies from IB professionals to a college sophomore. Classify the reply intent and extract structured signals for the recruiting pipeline.`;

export async function runWatcher(input: WatcherInput): Promise<WatcherOutput> {
  const ctx = await startAgentRun({
    agent: "watcher",
    userId: input.userId,
    triggeredBy: "cron",
    inputSummary: {},
  });

  const admin = getAdminClient();
  let sinceTimestamp = input.sinceTimestamp;
  if (!sinceTimestamp) {
    // Default: last successful watcher run for this user, or 1 day ago
    const { data: lastRun } = await admin
      .from("agent_runs")
      .select("started_at")
      .eq("agent", "watcher")
      .eq("user_id", input.userId)
      .order("started_at", { ascending: false })
      .limit(2)
      .maybeSingle();
    const fallback = Date.now() - 24 * 60 * 60 * 1000;
    const lastTime = lastRun?.started_at ? new Date(lastRun.started_at).getTime() : fallback;
    sinceTimestamp = Math.floor(lastTime / 1000) - 60; // buffer 1 min
  }

  try {
    const inbox = await pollInbox(input.userId, sinceTimestamp, input.maxMessages ?? 25);
    let repliesMatched = 0;
    let stagesAdvanced = 0;
    let metaInboxParsed = 0;

    for (const msg of inbox) {
      const meta = await processMetaInboxIfMatches(msg, input.userId);
      if (meta) {
        metaInboxParsed++;
        continue;
      }

      const match = await matchInboundToSentDraft(msg, input.userId);
      if (!match) continue;
      repliesMatched++;

      // Classify reply
      const classification = await classifyReply(msg);

      // Update connection stage
      if (classification.nextStage && match.connectionId) {
        await admin
          .from("connections")
          .update({ stage: classification.nextStage, updated_at: new Date().toISOString(), silence_days: 0, needs_followup: false })
          .eq("id", match.connectionId);
        stagesAdvanced++;
      }

      await logSignal({
        userId: input.userId,
        bankerId: match.bankerId,
        connectionId: match.connectionId,
        draftId: match.draftId,
        agent: "watcher",
        signalType: "reply_received",
        metadata: { intent: classification.intent, signals: classification.signals },
      });

      // Side-effects: extract deals into banker_deals (Curator will dedup)
      if (classification.signals.dealsMentioned.length > 0 && match.bankerId) {
        for (const deal of classification.signals.dealsMentioned.slice(0, 3)) {
          try {
            await admin.from("banker_deals").insert({
              banker_id: match.bankerId,
              deal_name: deal,
              source: "user_reply_extraction",
              confidence: 0.6,
            });
          } catch {
            // dedup happens in Curator
          }
        }
      }

      // Nudge planner if a follow-up is needed (e.g., schedule a coffee confirmation)
      if (classification.followUpNeeded) {
        await nudgePlanner(input.userId, "draft_reply", { bankerId: match.bankerId, connectionId: match.connectionId, incomingBody: msg.body });
      }
    }

    // Also sweep for silence → needs_followup
    const silenceUpdated = await detectSilenceAndFlag(input.userId);

    await endAgentRun(ctx, { processed: inbox.length, repliesMatched, stagesAdvanced, metaInboxParsed, silenceFlagged: silenceUpdated });

    return { processed: inbox.length, repliesMatched, stagesAdvanced, metaInboxParsed };
  } catch (err) {
    await endAgentRun(ctx, {}, String(err));
    throw err;
  }
}

async function classifyReply(msg: InboxMessage): Promise<ClassificationResult> {
  const prompt = `Incoming reply to analyze:

FROM: ${msg.from}
SUBJECT: ${msg.subject}

BODY:
${msg.body.slice(0, 2000)}

Return JSON:
{
  "intent": "interested" | "polite_no" | "request_time" | "off_topic" | "referral_offer" | "decline_remove" | "unknown",
  "signals": {
    "dealsMentioned": string[] (names of deals/transactions they reference),
    "bankersMentioned": string[] (other banker names they refer to),
    "proposedTimes": string[] (explicit time/date windows they propose),
    "referralTargets": string[] (names of people they offer to introduce),
    "groupMentions": string[] (IB groups / coverage areas they mention)
  },
  "nextStage": "replied" | "coffee" | "referral" | "closed_lost" (pick the strongest stage indicated),
  "followUpNeeded": boolean (should Alma draft a response?)
}

Rules:
- "request_time" = they proposed meeting but no specific time yet → nextStage = replied, followUpNeeded = true
- "interested" + proposed time = nextStage = coffee, followUpNeeded = true
- "referral_offer" = they offered to introduce someone = nextStage = referral, followUpNeeded = true
- "polite_no" or "decline_remove" = nextStage = closed_lost, followUpNeeded = false`;

  try {
    return await askClaudeJSON<ClassificationResult>(prompt, {
      systemPrompt: CLASSIFY_SYSTEM,
      maxTokens: 768,
      skipCache: true,
    });
  } catch {
    return {
      intent: "unknown",
      signals: { dealsMentioned: [], bankersMentioned: [], proposedTimes: [], referralTargets: [], groupMentions: [] },
      nextStage: "replied",
      followUpNeeded: false,
    };
  }
}

// Meta-inbox: detect replies to Alma's night-preview email and update trust_levels.tomorrow_override
async function processMetaInboxIfMatches(msg: InboxMessage, userId: string): Promise<boolean> {
  // Heuristic: subject starts with "Re: Tomorrow" AND the inbound In-Reply-To is alma-preview-*
  const isPreview = msg.inReplyTo?.includes("alma-preview") || msg.subject.toLowerCase().includes("tomorrow");
  if (!isPreview) return false;

  // Parse intent from reply body (tokens OR plain English)
  const body = msg.body.toLowerCase();
  const admin = getAdminClient();

  let override: Record<string, unknown> = {};

  if (/\bskip\b/.test(body)) override.skipDay = true;
  const laterMatch = body.match(/\blater\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (laterMatch) {
    const hr = parseInt(laterMatch[1], 10);
    const min = laterMatch[2] ? parseInt(laterMatch[2], 10) : 0;
    override.sendTime = `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const moreMatch = body.match(/\bmore\s+(\d{1,2})\b/);
  if (moreMatch) override.extraDrafts = parseInt(moreMatch[1], 10);
  if (/\bpreview\b/.test(body)) override.trustLevel = "B";

  // If none of the known tokens fired, pass body to Claude for plain-English parsing
  if (Object.keys(override).length === 0) {
    try {
      const parsed = await askClaudeJSON<{ sendTime?: string; extraDrafts?: number; skipDay?: boolean; trustLevel?: "C" | "B" | "A" }>(
        `Parse this reply to a recruiting agent's night preview into structured overrides for tomorrow only.

REPLY BODY:
${msg.body.slice(0, 800)}

Return JSON: {"sendTime"?: "HH:MM", "extraDrafts"?: number, "skipDay"?: boolean, "trustLevel"?: "C"|"B"|"A"}. Omit fields the reply doesn't address.`,
        { maxTokens: 256, skipCache: true }
      );
      override = { ...parsed };
    } catch {
      // give up silently
    }
  }

  if (Object.keys(override).length > 0) {
    await admin.from("trust_levels").update({ tomorrow_override: override as unknown as never, updated_at: new Date().toISOString() }).eq("user_id", userId);
    await logSignal({
      userId,
      agent: "watcher",
      signalType: "night_preview_override_applied",
      metadata: override,
    });
  }

  return true;
}

async function detectSilenceAndFlag(userId: string): Promise<number> {
  const admin = getAdminClient();
  const now = new Date();
  const SILENCE_DAYS_THRESHOLD = 7;
  const threshold = new Date(now.getTime() - SILENCE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString();

  const { data: silent } = await admin
    .from("connections")
    .select("id, banker_id, updated_at")
    .eq("user_id", userId)
    .eq("stage", "sent")
    .lt("updated_at", threshold)
    .eq("needs_followup", false);

  if (!silent || silent.length === 0) return 0;

  for (const c of silent) {
    const days = Math.floor((now.getTime() - new Date(c.updated_at ?? threshold).getTime()) / (24 * 60 * 60 * 1000));
    await admin.from("connections").update({ needs_followup: true, silence_days: days }).eq("id", c.id);
    await logSignal({
      userId,
      bankerId: c.banker_id ?? undefined,
      connectionId: c.id,
      agent: "watcher",
      signalType: "silence_detected",
      metadata: { days },
    });
  }

  return silent.length;
}
