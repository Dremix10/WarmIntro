// Watcher agent — poll Gmail, detect replies, classify intent, advance stages, trigger follow-ups
// Also handles meta-inbox (replies to Alma's night preview email)

import { startAgentRun, endAgentRun, askClaudeJSON, logSignal, nudgePlanner } from "./shared";
import { pollInbox, type InboxMessage } from "@/services/gmail/poll";
import { matchInboundToSentDraft } from "@/services/gmail/thread-match";
import { restSelect, restUpdate, restInsert, eq, lt } from "@/lib/supabase-rest";
import { advanceStage } from "@/services/pipeline/advanceStage";
import type { Json } from "@/lib/database.types";

export interface WatcherInput {
  userId: string;
  sinceTimestamp?: number;
  maxMessages?: number;
}

export interface WatcherOutput {
  processed: number;
  repliesMatched: number;
  stagesAdvanced: number;
  metaInboxParsed: number;
}

type ReplyIntent =
  | "interested" | "polite_no" | "request_time" | "off_topic"
  | "referral_offer" | "decline_remove" | "unknown";

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

  let sinceTimestamp = input.sinceTimestamp;
  if (!sinceTimestamp) {
    const recent = await restSelect("agent_runs", {
      select: "started_at",
      filters: { agent: eq("watcher"), user_id: eq(input.userId) },
      order: "started_at.desc",
      limit: 2,
    });
    const lastRun = recent[1]; // skip the current run, take the one before
    const fallback = Date.now() - 24 * 60 * 60 * 1000;
    const lastTime = lastRun?.started_at ? new Date(lastRun.started_at).getTime() : fallback;
    sinceTimestamp = Math.floor(lastTime / 1000) - 60;
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

      const classification = await classifyReply(msg);

      if (classification.nextStage && match.connectionId) {
        // Route through pipeline.advanceStage so the watcher uses the
        // same code path as manual stage moves on /crm — single source
        // of truth for the connection write + stage_X signal log.
        const adv = await advanceStage({
          userId: input.userId,
          connectionId: match.connectionId,
          toStage: classification.nextStage,
          via: "watcher",
          classificationMetadata: { intent: classification.intent },
        });
        if (adv.ok) stagesAdvanced++;
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

      if (classification.signals.dealsMentioned.length > 0 && match.bankerId) {
        for (const deal of classification.signals.dealsMentioned.slice(0, 3)) {
          await restInsert("banker_deals", {
            banker_id: match.bankerId,
            deal_name: deal,
            source: "user_reply_extraction",
            confidence: 0.6,
          });
        }
      }

      if (classification.followUpNeeded) {
        await nudgePlanner(input.userId, "draft_reply", {
          bankerId: match.bankerId,
          connectionId: match.connectionId,
          incomingBody: msg.body,
        });
      }
    }

    const silenceUpdated = await detectSilenceAndFlag(input.userId);

    await endAgentRun(ctx, {
      processed: inbox.length,
      repliesMatched,
      stagesAdvanced,
      metaInboxParsed,
      silenceFlagged: silenceUpdated,
    });

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
    "dealsMentioned": string[],
    "bankersMentioned": string[],
    "proposedTimes": string[],
    "referralTargets": string[],
    "groupMentions": string[]
  },
  "nextStage": "replied" | "coffee" | "referral" | "closed_lost",
  "followUpNeeded": boolean
}

Rules:
- "request_time" = proposed meeting, no time yet → nextStage = replied, followUpNeeded = true
- "interested" + time = nextStage = coffee, followUpNeeded = true
- "referral_offer" = nextStage = referral, followUpNeeded = true
- "polite_no" / "decline_remove" = nextStage = closed_lost, followUpNeeded = false`;

  try {
    return await askClaudeJSON<ClassificationResult>(prompt, {
      systemPrompt: CLASSIFY_SYSTEM,
      maxTokens: 768,
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
  const isPreview = msg.inReplyTo?.includes("alma-preview") || msg.subject.toLowerCase().includes("tomorrow");
  if (!isPreview) return false;

  const body = msg.body.toLowerCase();
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

  if (Object.keys(override).length === 0) {
    try {
      const parsed = await askClaudeJSON<{
        sendTime?: string;
        extraDrafts?: number;
        skipDay?: boolean;
        trustLevel?: "C" | "B" | "A";
      }>(
        `Parse this reply to a recruiting agent's night preview into structured overrides for tomorrow only.

REPLY BODY:
${msg.body.slice(0, 800)}

Return JSON: {"sendTime"?: "HH:MM", "extraDrafts"?: number, "skipDay"?: boolean, "trustLevel"?: "C"|"B"|"A"}. Omit fields the reply doesn't address.`,
        { maxTokens: 256 }
      );
      override = { ...parsed };
    } catch {
      // give up silently
    }
  }

  if (Object.keys(override).length > 0) {
    await restUpdate(
      "trust_levels",
      { tomorrow_override: override as Json, updated_at: new Date().toISOString() },
      { user_id: eq(userId) }
    );
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
  const now = new Date();
  const SILENCE_DAYS_THRESHOLD = 7;
  const threshold = new Date(now.getTime() - SILENCE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString();

  const silent = await restSelect("connections", {
    select: "id, banker_id, updated_at",
    filters: {
      user_id: eq(userId),
      stage: eq("sent"),
      updated_at: lt(threshold),
      needs_followup: eq(false),
    },
  });

  if (silent.length === 0) return 0;

  for (const c of silent) {
    const days = Math.floor((now.getTime() - new Date(c.updated_at ?? threshold).getTime()) / (24 * 60 * 60 * 1000));
    await restUpdate("connections", { needs_followup: true, silence_days: days }, { id: eq(c.id) });
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
