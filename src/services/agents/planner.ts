// Planner — deterministic orchestrator (NOT an LLM call)
// Reads user state, dispatches agents, gates trust-level send actions

import { startAgentRun, endAgentRun, logSignal, getAdminClient } from "./shared";
import { runResearcher, enrichBanker } from "./researcher";
import { runCorrespondent } from "./correspondent";
import { runCritic } from "./critic";
import { sendEmailAsUser, saveToDrafts } from "@/services/gmail/send";
import type { TrustLevel, TrustCapability } from "@/shared/ib-types";
import { TRUST_GRADUATION } from "@/shared/ib-constants";

const MAX_ITERATIONS_CORRESPONDENT_CRITIC = 3;
const MAX_PENDING_DRAFTS_PER_USER = 5;

export interface PlannerInput {
  userId: string;
  triggeredBy: "cron" | "event" | "user_command";
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
}

interface ProfileRow {
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

  const admin = getAdminClient();

  try {
    // 1. Load state
    const { data: profile } = await admin
      .from("profiles")
      .select("id, gmail_connected_at, gmail_email")
      .eq("id", input.userId)
      .single();
    if (!profile) {
      await endAgentRun(ctx, { error: "profile not found" }, "profile_not_found");
      return out;
    }
    const p = profile as unknown as ProfileRow;

    const { data: trust } = await admin
      .from("trust_levels")
      .select("*")
      .eq("user_id", input.userId)
      .maybeSingle();

    // Create default trust levels if missing
    let t: TrustLevelsRow;
    if (!trust) {
      await admin.from("trust_levels").insert({ user_id: input.userId });
      t = {
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
    } else {
      t = trust as unknown as TrustLevelsRow;
    }

    // 2. Count pending drafts
    const { count: pendingCount } = await admin
      .from("drafts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .in("status", ["pending_critic", "needs_revision", "approved"])
      .is("sent_at", null);

    const pending = pendingCount ?? 0;
    const needed = Math.max(0, MAX_PENDING_DRAFTS_PER_USER - pending);

    // 3. Dispatch Researcher if queue has room
    let plannerNudges: Array<{ hint: string; metadata: Record<string, unknown> }> = [];
    const { data: recentNudges } = await admin
      .from("signals")
      .select("metadata")
      .eq("user_id", input.userId)
      .eq("signal_type", "planner_nudge")
      .gte("occurred_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .limit(10);
    plannerNudges = (recentNudges ?? []).map((r) => r.metadata as { hint: string; metadata: Record<string, unknown> });

    if (needed > 0) {
      const research = await runResearcher({ userId: input.userId, needed });
      out.researcherSourced = research.sourced;

      // Dispatch Correspondent for each new candidate
      for (const c of research.candidates) {
        const ok = await draftWithCriticLoop(input.userId, c.bankerId, "cold");
        if (ok === "approved") out.coldDrafted++;
        if (ok === "escalated") {
          out.escalations++;
          // Try enrichment and re-queue
          const enriched = await enrichBanker(c.bankerId);
          if (enriched) {
            const retry = await draftWithCriticLoop(input.userId, c.bankerId, "cold");
            if (retry === "approved") out.coldDrafted++;
          }
        }
      }
    }

    // 4. Handle follow-ups: connections flagged needs_followup
    const { data: needsFollowup } = await admin
      .from("connections")
      .select("id, banker_id, stage, silence_days, updated_at")
      .eq("user_id", input.userId)
      .eq("needs_followup", true)
      .limit(3);

    for (const c of needsFollowup ?? []) {
      if (!c.banker_id) continue;
      const ok = await draftWithCriticLoop(input.userId, c.banker_id, "followup", c.id, { daysSilent: c.silence_days ?? 7 });
      if (ok === "approved") out.followupsDrafted++;
      if (ok === "escalated") out.escalations++;
      // Clear the flag either way; next Watcher run will re-flag if still silent
      await admin.from("connections").update({ needs_followup: false }).eq("id", c.id);
    }

    // 5. Handle reply nudges from Watcher
    for (const n of plannerNudges) {
      if (n.hint !== "draft_reply") continue;
      const bankerId = (n.metadata.bankerId as string) || null;
      const connectionId = (n.metadata.connectionId as string) || null;
      const incomingBody = (n.metadata.incomingBody as string) || "";
      if (!bankerId) continue;
      const ok = await draftWithCriticLoop(input.userId, bankerId, "reply", connectionId ?? undefined, { incomingReplyBody: incomingBody });
      if (ok === "approved") out.repliesDrafted++;
      if (ok === "escalated") out.escalations++;
    }

    // 6. Send approved drafts according to trust level
    const sendResult = await sendApprovedDrafts(input.userId, t, p);
    out.approved = sendResult.approved;
    out.sent = sendResult.sent;
    out.savedToDrafts = sendResult.savedToDrafts;

    // 7. Trust-level auto-graduation
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
  let currentDraftId: string | undefined;

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

    currentDraftId = draft.draftId;
    const review = await runCritic({ draftId: draft.draftId });

    if (review.verdict === "approve") {
      return "approved";
    }
    if (review.verdict === "escalate_to_planner") {
      return "escalated";
    }
    revisionFeedback = review.feedback;
    iteration++;
  }
  return currentDraftId ? "rejected" : "rejected";
}

async function sendApprovedDrafts(
  userId: string,
  trust: TrustLevelsRow,
  profile: ProfileRow
): Promise<{ approved: number; sent: number; savedToDrafts: number }> {
  const admin = getAdminClient();
  const now = new Date();
  const out = { approved: 0, sent: 0, savedToDrafts: 0 };

  const { data: approvedDrafts } = await admin
    .from("drafts")
    .select("id, banker_id, connection_id, type, subject, body")
    .eq("user_id", userId)
    .eq("status", "approved")
    .is("sent_at", null)
    .limit(10);

  if (!approvedDrafts || approvedDrafts.length === 0) return out;

  // Check today's tomorrow_override for one-time settings
  const override = trust.tomorrow_override ?? {};
  const effectiveLevelFor = (cap: TrustCapability): TrustLevel => {
    if (override.trustLevel && typeof override.trustLevel === "string") return override.trustLevel as TrustLevel;
    if (cap === "send_new_email") return trust.send_new_email;
    if (cap === "send_followup") return trust.send_followup;
    return trust.send_reply;
  };

  if ((override as { skipDay?: boolean }).skipDay) {
    // Leave approved drafts alone; they'll be picked up next run
    return out;
  }

  for (const d of approvedDrafts) {
    out.approved++;
    const cap: TrustCapability = d.type === "cold" ? "send_new_email" : d.type === "followup" ? "send_followup" : "send_reply";
    const level = effectiveLevelFor(cap);

    // banker email
    const { data: banker } = await admin.from("bankers").select("email").eq("id", d.banker_id ?? "").maybeSingle();
    if (!banker?.email) continue; // can't send without recipient

    if (level === "C") {
      // Save to Gmail Drafts folder, do NOT send
      const res = await saveToDrafts({
        userId,
        fromEmail: profile.gmail_email ?? "",
        toEmail: banker.email,
        subject: d.subject ?? "",
        body: d.body,
      });
      if (res) {
        await admin.from("drafts").update({ status: "skipped", updated_at: new Date().toISOString() }).eq("id", d.id);
        out.savedToDrafts++;
      }
    } else if (level === "B") {
      // Schedule send for `preview window` minutes from now if not already scheduled
      const { data: current } = await admin.from("drafts").select("scheduled_send_at").eq("id", d.id).single();
      if (!current?.scheduled_send_at) {
        const sendAt = new Date(now.getTime() + TRUST_GRADUATION.previewWindowMin * 60_000);
        await admin.from("drafts").update({ scheduled_send_at: sendAt.toISOString() }).eq("id", d.id);
      } else if (new Date(current.scheduled_send_at) <= now) {
        // Time is up — send
        const res = await sendEmailAsUser({
          userId,
          fromEmail: profile.gmail_email ?? "",
          toEmail: banker.email,
          subject: d.subject ?? "",
          body: d.body,
        });
        if (res) {
          await admin
            .from("drafts")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              sent_message_id: res.sentMessageId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", d.id);
          await createOrUpdateConnection(userId, d.banker_id!, d.id, res.sentMessageId, res.gmailThreadId);
          await incrementApprovalCount(userId, cap);
          await logSignal({ userId, bankerId: d.banker_id ?? undefined, draftId: d.id, agent: "planner", signalType: "draft_sent", metadata: { type: d.type } });
          out.sent++;
        }
      }
    } else {
      // Autopilot A — send now
      const res = await sendEmailAsUser({
        userId,
        fromEmail: profile.gmail_email ?? "",
        toEmail: banker.email,
        subject: d.subject ?? "",
        body: d.body,
      });
      if (res) {
        await admin
          .from("drafts")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_message_id: res.sentMessageId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.id);
        await createOrUpdateConnection(userId, d.banker_id!, d.id, res.sentMessageId, res.gmailThreadId);
        await incrementApprovalCount(userId, cap);
        await logSignal({ userId, bankerId: d.banker_id ?? undefined, draftId: d.id, agent: "planner", signalType: "draft_sent", metadata: { type: d.type, autopilot: true } });
        out.sent++;
      }
    }
  }

  // Clear one-time override after use
  if (override && Object.keys(override).length > 0) {
    await admin.from("trust_levels").update({ tomorrow_override: null, updated_at: new Date().toISOString() }).eq("user_id", userId);
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
  const admin = getAdminClient();
  const { data: banker } = await admin
    .from("bankers")
    .select("name, title, linkedin_url, firm_id, firms(name)")
    .eq("id", bankerId)
    .single();
  if (!banker) return;

  const { data: draft } = await admin.from("drafts").select("connection_id").eq("id", draftId).single();
  if (draft?.connection_id) {
    await admin
      .from("connections")
      .update({
        stage: "sent",
        last_send_message_id: sentMessageId,
        thread_id: threadId,
        silence_days: 0,
        needs_followup: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.connection_id);
  } else {
    const firmName = (banker as unknown as { firms: { name?: string } | null }).firms?.name ?? banker.firm_id ?? "";
    const { data: inserted } = await admin
      .from("connections")
      .insert({
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
      })
      .select("id")
      .single();
    if (inserted?.id) {
      await admin.from("drafts").update({ connection_id: inserted.id }).eq("id", draftId);
    }
  }
}

async function incrementApprovalCount(userId: string, cap: TrustCapability): Promise<void> {
  const admin = getAdminClient();
  const { data: current } = await admin
    .from("trust_levels")
    .select("approvals_count_new, approvals_count_followup, approvals_count_reply")
    .eq("user_id", userId)
    .maybeSingle();
  const updates: Record<string, number> = {};
  if (cap === "send_new_email") updates.approvals_count_new = (current?.approvals_count_new ?? 0) + 1;
  else if (cap === "send_followup") updates.approvals_count_followup = (current?.approvals_count_followup ?? 0) + 1;
  else updates.approvals_count_reply = (current?.approvals_count_reply ?? 0) + 1;
  await admin.from("trust_levels").update(updates).eq("user_id", userId);
}

async function checkAndGraduate(userId: string, trust: TrustLevelsRow): Promise<void> {
  if (!trust.auto_graduate) return;
  const admin = getAdminClient();

  const updates: Partial<TrustLevelsRow> = {};
  const caps: Array<{ cap: TrustCapability; countField: keyof TrustLevelsRow; levelField: keyof TrustLevelsRow; level: TrustLevel; count: number }> = [
    { cap: "send_new_email", countField: "approvals_count_new", levelField: "send_new_email", level: trust.send_new_email, count: trust.approvals_count_new },
    { cap: "send_followup", countField: "approvals_count_followup", levelField: "send_followup", level: trust.send_followup, count: trust.approvals_count_followup },
    { cap: "send_reply", countField: "approvals_count_reply", levelField: "send_reply", level: trust.send_reply, count: trust.approvals_count_reply },
  ];

  for (const c of caps) {
    if (c.level === "C" && c.count >= TRUST_GRADUATION.cToB_approvals) {
      (updates as Record<string, string>)[c.levelField] = "B";
      await logSignal({ userId, agent: "planner", signalType: "trust_graduated_C_to_B", metadata: { capability: c.cap } });
    } else if (c.level === "B" && c.count >= TRUST_GRADUATION.cToB_approvals + TRUST_GRADUATION.bToA_approvals) {
      (updates as Record<string, string>)[c.levelField] = "A";
      await logSignal({ userId, agent: "planner", signalType: "trust_graduated_B_to_A", metadata: { capability: c.cap } });
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("trust_levels").update(updates as never).eq("user_id", userId);
  }
}
