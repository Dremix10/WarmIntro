// Planner — deterministic orchestrator (NOT an LLM call)
// Reads user state, dispatches agents, gates trust-level send actions

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { runResearcher, enrichBanker } from "./researcher";
import { runCorrespondent } from "./correspondent";
import { runCritic } from "./critic";
import { sendEmailAsUser, saveToDrafts } from "@/services/gmail/send";
import { restSelect, restSelectOne, restInsert, restUpdate, restCount, eq, isNull, gte } from "@/lib/supabase-rest";
import type { TrustLevel, TrustCapability } from "@/shared/ib-types";
import { TRUST_GRADUATION } from "@/shared/ib-constants";
import type { Json } from "@/lib/database.types";

const MAX_ITERATIONS_CORRESPONDENT_CRITIC = 3;
const MAX_PENDING_DRAFTS_PER_USER = 5;

export interface PlannerInput {
  userId: string;
  triggeredBy: "cron" | "event" | "user_command";
  maxCandidates?: number;
}

export interface PlannerOutput {
  researcherSourced: number;
  coldDrafted: number;
  followupsDrafted: number;
  repliesDrafted: number;
  approved: number;
  sent: number;
  savedToDrafts: number;
  escalations: number;
  needsSetup?: boolean;
}

interface ProfileForSend {
  id: string;
  gmail_connected_at: string | null;
  gmail_email: string | null;
}

interface TrustLevelsRow {
  user_id: string;
  send_new_email: TrustLevel;
  send_followup: TrustLevel;
  send_reply: TrustLevel;
  approvals_count_new: number;
  approvals_count_followup: number;
  approvals_count_reply: number;
  auto_graduate: boolean;
  preferred_send_time: string;
  preferred_timezone: string;
  tomorrow_override: Record<string, unknown> | null;
}

export async function runPlanner(input: PlannerInput): Promise<PlannerOutput> {
  const ctx = await startAgentRun({
    agent: "planner",
    userId: input.userId,
    triggeredBy: input.triggeredBy,
  });

  const out: PlannerOutput = {
    researcherSourced: 0,
    coldDrafted: 0,
    followupsDrafted: 0,
    repliesDrafted: 0,
    approved: 0,
    sent: 0,
    savedToDrafts: 0,
    escalations: 0,
  };

  try {
    // 1. Load profile
    const profile = await restSelectOne("profiles", {
      select: "id, gmail_connected_at, gmail_email, target_firms",
      filters: { id: eq(input.userId) },
    });
    if (!profile) {
      await endAgentRun(ctx, { error: "profile not found — user must complete /setup" }, "profile_not_found");
      return { ...out, needsSetup: true };
    }
    if (!profile.target_firms || profile.target_firms.length === 0) {
      await endAgentRun(ctx, { error: "no target_firms — user must complete /setup" }, "setup_incomplete");
      return { ...out, needsSetup: true };
    }
    const p: ProfileForSend = {
      id: profile.id,
      gmail_connected_at: profile.gmail_connected_at,
      gmail_email: profile.gmail_email,
    };

    // 2. Load / create trust levels
    let trust = (await restSelectOne("trust_levels", {
      select: "*",
      filters: { user_id: eq(input.userId) },
    })) as TrustLevelsRow | null;

    if (!trust) {
      await restInsert("trust_levels", { user_id: input.userId });
      trust = {
        user_id: input.userId,
        send_new_email: "C",
        send_followup: "C",
        send_reply: "C",
        approvals_count_new: 0,
        approvals_count_followup: 0,
        approvals_count_reply: 0,
        auto_graduate: true,
        preferred_send_time: "07:00",
        preferred_timezone: "America/New_York",
        tomorrow_override: null,
      };
    }
    const t = trust;

    // 3. Count pending drafts (HEAD with count=exact)
    const pending = await restCount("drafts", {
      user_id: eq(input.userId),
      status: `in.("pending_critic","needs_revision","approved")`,
      sent_at: isNull,
    });

    const batchCap = input.maxCandidates ?? MAX_PENDING_DRAFTS_PER_USER;
    const needed = Math.max(0, Math.min(MAX_PENDING_DRAFTS_PER_USER - pending, batchCap));

    // 4. Recent nudges from Watcher (for reply drafts)
    const recentNudges = await restSelect("signals", {
      select: "metadata",
      filters: {
        user_id: eq(input.userId),
        signal_type: eq("planner_nudge"),
        occurred_at: gte(new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()),
      },
      limit: 10,
    });
    const plannerNudges = recentNudges.map((r) => r.metadata as { hint: string; metadata: Record<string, unknown> });

    // 5. Dispatch Researcher if queue has room
    if (needed > 0) {
      const research = await runResearcher({ userId: input.userId, needed });
      out.researcherSourced = research.sourced;

      for (const c of research.candidates) {
        const result = await draftWithCriticLoop(input.userId, c.bankerId, "cold");
        if (result === "approved") out.coldDrafted++;
        if (result === "escalated") {
          out.escalations++;
          const enriched = await enrichBanker(c.bankerId);
          if (enriched) {
            const retry = await draftWithCriticLoop(input.userId, c.bankerId, "cold");
            if (retry === "approved") out.coldDrafted++;
          }
        }
      }
    }

    // 6. Handle follow-ups
    const needsFollowup = await restSelect("connections", {
      select: "id, banker_id, stage, silence_days, updated_at",
      filters: { user_id: eq(input.userId), needs_followup: eq(true) },
      limit: 3,
    });
    for (const c of needsFollowup) {
      if (!c.banker_id) continue;
      const result = await draftWithCriticLoop(input.userId, c.banker_id, "followup", c.id, {
        daysSilent: c.silence_days ?? 7,
      });
      if (result === "approved") out.followupsDrafted++;
      if (result === "escalated") out.escalations++;
      await restUpdate("connections", { needs_followup: false }, { id: eq(c.id) });
    }

    // 7. Handle reply nudges from Watcher
    for (const n of plannerNudges) {
      if (n.hint !== "draft_reply") continue;
      const bankerId = (n.metadata.bankerId as string) || null;
      const connectionId = (n.metadata.connectionId as string) || null;
      const incomingBody = (n.metadata.incomingBody as string) || "";
      if (!bankerId) continue;
      const result = await draftWithCriticLoop(input.userId, bankerId, "reply", connectionId ?? undefined, {
        incomingReplyBody: incomingBody,
      });
      if (result === "approved") out.repliesDrafted++;
      if (result === "escalated") out.escalations++;
    }

    // 8. Send approved drafts according to trust level
    const sendResult = await sendApprovedDrafts(input.userId, t, p);
    out.approved = sendResult.approved;
    out.sent = sendResult.sent;
    out.savedToDrafts = sendResult.savedToDrafts;

    // 9. Trust-level auto-graduation
    await checkAndGraduate(input.userId, t);

    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}

// Core loop: Correspondent -> Critic -> revise up to N times
async function draftWithCriticLoop(
  userId: string,
  bankerId: string,
  type: "cold" | "followup" | "reply" | "thank_you",
  connectionId?: string,
  threadContext?: { daysSilent?: number; incomingReplyBody?: string; previousMessageBodyPreview?: string }
): Promise<"approved" | "rejected" | "escalated" | "no_anchor"> {
  let iteration = 0;
  let revisionFeedback: string | undefined;

  while (iteration < MAX_ITERATIONS_CORRESPONDENT_CRITIC) {
    const draft = await runCorrespondent({
      userId,
      type,
      bankerId,
      connectionId,
      threadContext,
      revisionFeedback,
    });

    if (draft.rejectedForNoAnchor) return "no_anchor";
    if (!draft.draftId) return "rejected";

    const review = await runCritic({ draftId: draft.draftId });
    if (review.verdict === "approve") return "approved";
    if (review.verdict === "escalate_to_planner") return "escalated";
    revisionFeedback = review.feedback;
    iteration++;
  }
  return "rejected";
}

async function sendApprovedDrafts(
  userId: string,
  trust: TrustLevelsRow,
  profile: ProfileForSend
): Promise<{ approved: number; sent: number; savedToDrafts: number }> {
  const now = new Date();
  const out = { approved: 0, sent: 0, savedToDrafts: 0 };

  const approvedDrafts = await restSelect("drafts", {
    select: "id, banker_id, connection_id, type, subject, body, scheduled_send_at",
    filters: { user_id: eq(userId), status: eq("approved"), sent_at: isNull },
    limit: 10,
  });

  if (approvedDrafts.length === 0) return out;

  const override = trust.tomorrow_override ?? {};
  const effectiveLevelFor = (cap: TrustCapability): TrustLevel => {
    const forcedLevel = (override as { trustLevel?: string }).trustLevel;
    if (forcedLevel === "C" || forcedLevel === "B" || forcedLevel === "A") return forcedLevel;
    if (cap === "send_new_email") return trust.send_new_email;
    if (cap === "send_followup") return trust.send_followup;
    return trust.send_reply;
  };

  if ((override as { skipDay?: boolean }).skipDay) return out;

  for (const d of approvedDrafts) {
    out.approved++;
    const cap: TrustCapability = d.type === "cold" ? "send_new_email" : d.type === "followup" ? "send_followup" : "send_reply";
    const level = effectiveLevelFor(cap);

    const banker = d.banker_id
      ? await restSelectOne("bankers", { select: "email", filters: { id: eq(d.banker_id) } })
      : null;
    if (!banker?.email) continue;

    if (level === "C") {
      const res = await saveToDrafts({
        userId,
        fromEmail: profile.gmail_email ?? "",
        toEmail: banker.email,
        subject: d.subject ?? "",
        body: d.body,
      });
      if (res) {
        await restUpdate("drafts", { status: "skipped", updated_at: new Date().toISOString() }, { id: eq(d.id) });
        out.savedToDrafts++;
      }
    } else if (level === "B") {
      if (!d.scheduled_send_at) {
        const sendAt = new Date(now.getTime() + TRUST_GRADUATION.previewWindowMin * 60_000);
        await restUpdate("drafts", { scheduled_send_at: sendAt.toISOString() }, { id: eq(d.id) });
      } else if (new Date(d.scheduled_send_at) <= now) {
        const res = await sendEmailAsUser({
          userId,
          fromEmail: profile.gmail_email ?? "",
          toEmail: banker.email,
          subject: d.subject ?? "",
          body: d.body,
        });
        if (res) {
          await restUpdate(
            "drafts",
            {
              status: "sent",
              sent_at: new Date().toISOString(),
              sent_message_id: res.sentMessageId,
              updated_at: new Date().toISOString(),
            },
            { id: eq(d.id) }
          );
          if (d.banker_id) {
            await createOrUpdateConnection(userId, d.banker_id, d.id, res.sentMessageId, res.gmailThreadId);
          }
          await incrementApprovalCount(userId, cap);
          await logSignal({
            userId,
            bankerId: d.banker_id ?? undefined,
            draftId: d.id,
            agent: "planner",
            signalType: "draft_sent",
            metadata: { type: d.type },
          });
          out.sent++;
        }
      }
    } else {
      const res = await sendEmailAsUser({
        userId,
        fromEmail: profile.gmail_email ?? "",
        toEmail: banker.email,
        subject: d.subject ?? "",
        body: d.body,
      });
      if (res) {
        await restUpdate(
          "drafts",
          {
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_message_id: res.sentMessageId,
            updated_at: new Date().toISOString(),
          },
          { id: eq(d.id) }
        );
        if (d.banker_id) {
          await createOrUpdateConnection(userId, d.banker_id, d.id, res.sentMessageId, res.gmailThreadId);
        }
        await incrementApprovalCount(userId, cap);
        await logSignal({
          userId,
          bankerId: d.banker_id ?? undefined,
          draftId: d.id,
          agent: "planner",
          signalType: "draft_sent",
          metadata: { type: d.type, autopilot: true },
        });
        out.sent++;
      }
    }
  }

  if (override && Object.keys(override).length > 0) {
    await restUpdate(
      "trust_levels",
      { tomorrow_override: null as unknown as Json, updated_at: new Date().toISOString() },
      { user_id: eq(userId) }
    );
  }

  return out;
}

async function createOrUpdateConnection(
  userId: string,
  bankerId: string,
  draftId: string,
  sentMessageId: string,
  threadId: string
): Promise<void> {
  const banker = await restSelectOne("bankers", {
    select: "name, title, linkedin_url, firm_id",
    filters: { id: eq(bankerId) },
  });
  if (!banker) return;

  const firm = banker.firm_id
    ? await restSelectOne("firms", { select: "name", filters: { id: eq(banker.firm_id) } })
    : null;
  const firmName = firm?.name ?? banker.firm_id ?? "";

  const draft = await restSelectOne("drafts", {
    select: "connection_id",
    filters: { id: eq(draftId) },
  });

  if (draft?.connection_id) {
    await restUpdate(
      "connections",
      {
        stage: "sent",
        last_send_message_id: sentMessageId,
        thread_id: threadId,
        silence_days: 0,
        needs_followup: false,
        updated_at: new Date().toISOString(),
      },
      { id: eq(draft.connection_id) }
    );
  } else {
    const inserted = await restInsert("connections", {
      user_id: userId,
      alumni_id: bankerId, // legacy column name
      alumni_name: banker.name,
      alumni_role: banker.title,
      alumni_linkedin_url: banker.linkedin_url ?? "",
      company_id: banker.firm_id ?? "",
      company_name: firmName,
      stage: "sent",
      banker_id: bankerId,
      last_send_message_id: sentMessageId,
      thread_id: threadId,
    });
    const newConnectionId = inserted[0]?.id;
    if (newConnectionId) {
      await restUpdate("drafts", { connection_id: newConnectionId }, { id: eq(draftId) });
    }
  }
}

async function incrementApprovalCount(userId: string, cap: TrustCapability): Promise<void> {
  const current = await restSelectOne("trust_levels", {
    select: "approvals_count_new, approvals_count_followup, approvals_count_reply",
    filters: { user_id: eq(userId) },
  });
  const updates: Record<string, number> = {};
  if (cap === "send_new_email") updates.approvals_count_new = (current?.approvals_count_new ?? 0) + 1;
  else if (cap === "send_followup") updates.approvals_count_followup = (current?.approvals_count_followup ?? 0) + 1;
  else updates.approvals_count_reply = (current?.approvals_count_reply ?? 0) + 1;
  await restUpdate("trust_levels", updates, { user_id: eq(userId) });
}

async function checkAndGraduate(userId: string, trust: TrustLevelsRow): Promise<void> {
  if (!trust.auto_graduate) return;

  const updates: Record<string, string> = {};
  const caps: Array<{ cap: TrustCapability; levelField: keyof TrustLevelsRow; level: TrustLevel; count: number }> = [
    { cap: "send_new_email", levelField: "send_new_email", level: trust.send_new_email, count: trust.approvals_count_new },
    { cap: "send_followup", levelField: "send_followup", level: trust.send_followup, count: trust.approvals_count_followup },
    { cap: "send_reply", levelField: "send_reply", level: trust.send_reply, count: trust.approvals_count_reply },
  ];

  for (const c of caps) {
    if (c.level === "C" && c.count >= TRUST_GRADUATION.cToB_approvals) {
      updates[c.levelField] = "B";
      await logSignal({ userId, agent: "planner", signalType: "trust_graduated_C_to_B", metadata: { capability: c.cap } });
    } else if (c.level === "B" && c.count >= TRUST_GRADUATION.cToB_approvals + TRUST_GRADUATION.bToA_approvals) {
      updates[c.levelField] = "A";
      await logSignal({ userId, agent: "planner", signalType: "trust_graduated_B_to_A", metadata: { capability: c.cap } });
    }
  }

  if (Object.keys(updates).length > 0) {
    await restUpdate("trust_levels", updates, { user_id: eq(userId) });
  }
}
