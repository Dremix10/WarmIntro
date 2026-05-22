// Planner — deterministic orchestrator (NOT an LLM call)
// Reads user state, dispatches agents, gates trust-level send actions

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { runResearcher, enrichBanker } from "./researcher";
import { runCorrespondent } from "./correspondent";
import { runCritic } from "./critic";
import { saveToDrafts } from "@/services/gmail/send";
import { ensureGmailDraft } from "@/services/gmail/sync-draft";
import { sendDraft } from "@/services/outreach/sendDraft";
import { restSelect, restSelectOne, restInsert, restUpdate, restCount, eq, isNull, gte } from "@/lib/supabase-rest";
import type { TrustLevel, TrustCapability } from "@/shared/ib-types";
import { TRUST_GRADUATION } from "@/shared/ib-constants";
import type { Json } from "@/lib/database.types";

// Lowered from 3 → 2 on 2026-05-01, then 2 → 1 same day after the
// first Architect digest:
//
//   "Iteration regression on the Christian/MS draft (3 of 10 rows
//    same draftId at iter 2 with iterationRegression=true and
//    cumulativeStackedConstraints=true). By iter 2 the body is
//    essentially unchanged even though earlier iterations flagged
//    both. With cumulativeStackedConstraints=true, the revise prompt
//    is now a long stack of feedback the model partially honors and
//    partially drops — exactly the Opus 4.7 trade-off pattern."
//   — Architect, 2026-05-01 18:46 UTC
//
// On thin-data drafts the iter 1 retry rarely produces a substantively
// better email; it just shuffles which constraint gets dropped. Better
// to hand a single iter-0 attempt to the user (with Send Anyway / Edit
// / Skip-with-reason) and let them either approve, edit, or trigger a
// regenerate via skip-with-reason — that path now passes a single
// targeted critic-style note, not a stacked transcript.
const MAX_ITERATIONS_CORRESPONDENT_CRITIC = 1;
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
  queueFull?: boolean;
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
      // Expected state for new signups — not an error to alert on. Cron should
      // also filter these out at the source, but defense in depth.
      await endAgentRun(ctx, { skipped: "no_profile_yet", needsSetup: true });
      return { ...out, needsSetup: true };
    }
    if (!profile.target_firms || profile.target_firms.length === 0) {
      await endAgentRun(ctx, { skipped: "setup_incomplete", needsSetup: true });
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

    // 3. Count pending drafts (HEAD with count=exact). `needs_revision` is
    // intentionally excluded: with MAX_ITERATIONS_CORRESPONDENT_CRITIC = 1,
    // those rows are now expected to be transient (Critic escalates iter-0
    // rejects straight to `rejected_unresolvable`). Defense in depth: if a
    // legacy `needs_revision` row ever lingers, it should not block fresh
    // drafting — the user already sees it on /today via the escalation path.
    const pending = await restCount("drafts", {
      user_id: eq(input.userId),
      status: `in.("pending_critic","approved")`,
      sent_at: isNull,
    });

    const batchCap = input.maxCandidates ?? MAX_PENDING_DRAFTS_PER_USER;
    const needed = Math.max(0, Math.min(MAX_PENDING_DRAFTS_PER_USER - pending, batchCap));

    // Surface "queue full" up to the UI so the run-now button can tell the
    // user "approve or skip something first" instead of saying "Done ✓"
    // when nothing actually happened. Cofounder hit this — see issue #2/#7.
    if (needed === 0 && batchCap > 0) {
      out.queueFull = true;
    }

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
    // nudgePlanner() (services/agents/shared.ts) writes metadata as a FLAT
    // object: { hint, ...rest }. Reading it as nested { hint, metadata } was
    // the source of 11 "Cannot read properties of undefined (reading
    // 'bankerId')" crashes on Anya's planner around 2026-05-06 — every
    // banker reply triggered a nudge and every nudge crashed the run.
    const plannerNudges = recentNudges.map((r) => r.metadata as {
      hint: string;
      bankerId?: string;
      connectionId?: string;
      incomingBody?: string;
    });

    // 5. Dispatch Researcher if queue has room
    if (needed > 0) {
      const research = await runResearcher({ userId: input.userId, needed });
      out.researcherSourced = research.sourced;

      for (const c of research.candidates) {
        if (!c?.bankerId) {
          console.warn("[planner] researcher returned candidate without bankerId", c);
          continue;
        }
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
      const bankerId = n.bankerId ?? null;
      const connectionId = n.connectionId ?? null;
      const incomingBody = n.incomingBody ?? "";
      if (!bankerId) continue;
      const result = await draftWithCriticLoop(input.userId, bankerId, "reply", connectionId ?? undefined, {
        incomingReplyBody: incomingBody,
      });
      if (result === "approved") out.repliesDrafted++;
      if (result === "escalated") out.escalations++;
    }

    // 8. Send approved drafts according to trust level. SKIPPED on user-
    //    triggered runs because:
    //    - Trust C (Copilot): the level-C path saves drafts to Gmail and
    //      marks our DB row as "skipped". When the user just clicked Run
    //      Alma, that vanishes the new draft from /today before they can
    //      see it. They expect /today to show the result of their click.
    //    - Trust B (Preview-veto): scheduled sends in 30 min — same
    //      argument, user wants to see the draft on /today first.
    //    - Trust A (Autopilot): user opted into "send for me," but it's
    //      still surprising on a user-triggered run vs a cron run. Keep
    //      consistent: user_command never auto-sends.
    //    Cron-driven runs still process approved drafts as before.
    if (input.triggeredBy !== "user_command") {
      const sendResult = await sendApprovedDrafts(input.userId, t, p);
      out.approved = sendResult.approved;
      out.sent = sendResult.sent;
      out.savedToDrafts = sendResult.savedToDrafts;
    } else {
      // user_command path: don't auto-send, but DO mirror approved drafts
      // into the user's Gmail Drafts folder so they can preview there
      // (and the eventual Auto-send via Gmail uses drafts.send for atomic
      // conversion). Status stays "approved" — drafts remain visible on
      // /today with the action buttons.
      const approvedNow = await restSelect("drafts", {
        select: "id",
        filters: { user_id: eq(input.userId), status: eq("approved"), sent_at: isNull },
        limit: 10,
      });
      for (const d of approvedNow) {
        try {
          await ensureGmailDraft(d.id);
        } catch (err) {
          console.warn(`[planner] ensureGmailDraft failed for ${d.id}`, err);
        }
      }
    }

    // 9. Trust-level auto-graduation
    await checkAndGraduate(input.userId, t);

    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}

// Core loop: Correspondent -> Critic -> revise up to N times. The
// Correspondent UPDATEs the same draft row on revise iterations (the
// unique-active-draft index forbids parallel rows), so we thread the
// draftId through after the first iteration.
async function draftWithCriticLoop(
  userId: string,
  bankerId: string,
  type: "cold" | "followup" | "reply" | "thank_you",
  connectionId?: string,
  threadContext?: { daysSilent?: number; incomingReplyBody?: string; previousMessageBodyPreview?: string }
): Promise<"approved" | "rejected" | "escalated" | "no_anchor"> {
  let iteration = 0;
  // Cumulative feedback — every prior Critic verdict, not just the latest.
  // Without this, the Correspondent forgets iter 0's "no career-arc framing"
  // lesson when it sees iter 1's different feedback, and we end up
  // reintroducing banned phrases on iter 2. Empirically observed.
  const revisionFeedbackHistory: string[] = [];
  let existingDraftId: string | undefined;

  while (iteration < MAX_ITERATIONS_CORRESPONDENT_CRITIC) {
    const draft = await runCorrespondent({
      userId,
      type,
      bankerId,
      connectionId,
      threadContext,
      revisionFeedbackHistory: revisionFeedbackHistory.length > 0 ? [...revisionFeedbackHistory] : undefined,
      existingDraftId,
      iteration,
    });

    if (draft.rejectedForNoAnchor) return "no_anchor";
    if (!draft.draftId) return "rejected";
    existingDraftId = draft.draftId;

    const review = await runCritic({ draftId: draft.draftId });
    if (review.verdict === "approve") return "approved";
    if (review.verdict === "escalate_to_planner") return "escalated";
    if (review.feedback) revisionFeedbackHistory.push(review.feedback);
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
    select: "id, banker_id, connection_id, type, subject, body, user_edited_body, critic_override, scheduled_send_at",
    filters: { user_id: eq(userId), status: eq("approved"), sent_at: isNull },
    limit: 10,
  });

  if (approvedDrafts.length === 0) return out;

  // Treat expired overrides as absent. Tick handler also clears them, but
  // this is the defense-in-depth path for the user_command trigger
  // (Run Alma button) which bypasses the tick gate entirely.
  const rawOverride = trust.tomorrow_override as { validUntil?: string; skipDay?: boolean; trustLevel?: string; sendTime?: string } | null;
  const overrideExpired = !!rawOverride && (!rawOverride.validUntil || Date.parse(rawOverride.validUntil) <= now.getTime());
  const override: { skipDay?: boolean; trustLevel?: string; sendTime?: string } = overrideExpired ? {} : (rawOverride ?? {});
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

    if (level === "C") {
      // Trust C / Copilot: don't send. Mirror to user's Gmail Drafts
      // and mark our row as 'skipped' so /today shows nothing pending.
      // saveToDrafts needs the banker's email; the helper-routed B/A
      // paths get this check inside sendDraft, but C still does it
      // inline since it bypasses the helper entirely.
      const banker = d.banker_id
        ? await restSelectOne("bankers", { select: "email", filters: { id: eq(d.banker_id) } })
        : null;
      if (!banker?.email) continue;
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
      // Trust B / Preview-veto: schedule on first encounter, actually
      // send once the preview window has passed.
      if (!d.scheduled_send_at) {
        const sendAt = new Date(now.getTime() + TRUST_GRADUATION.previewWindowMin * 60_000);
        await restUpdate("drafts", { scheduled_send_at: sendAt.toISOString() }, { id: eq(d.id) });
      } else if (new Date(d.scheduled_send_at) <= now) {
        const sendResult = await sendDraft({
          userId,
          draftId: d.id,
          via: "planner_preview_veto_B",
        });
        if (sendResult.ok && sendResult.status === "sent") {
          await incrementApprovalCount(userId, cap);
          out.sent++;
        }
      }
    } else {
      // Trust A / Autopilot: immediate send through the helper.
      const sendResult = await sendDraft({
        userId,
        draftId: d.id,
        via: "planner_autopilot_A",
      });
      if (sendResult.ok && sendResult.status === "sent") {
        await incrementApprovalCount(userId, cap);
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

// Connection writes moved to services/pipeline/upsertConnectionAtStage.ts.
// All four send paths (button, send-all, mark_sent, planner autopilot)
// route through there now via outreach/sendDraft. See docs/refactor-plan.md (D6).

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
