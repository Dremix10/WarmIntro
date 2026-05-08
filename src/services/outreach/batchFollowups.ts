import { getAdminClient } from "@/lib/supabase-admin";
import { applyGuardrails, sanitizeEmailSubject } from "@/services/guardrails";
import { ensureGmailDraft } from "@/services/gmail/sync-draft";
import { sendDraft } from "@/services/outreach/sendDraft";
import { logSignal } from "@/services/signals/log";

type BatchMode = "draft" | "send";

export interface BatchFollowupInput {
  minAgeHours?: number;
  mode?: BatchMode;
  dryRun?: boolean;
  userEmails?: string[];
  limit?: number;
}

export interface BatchFollowupSummary {
  mode: BatchMode;
  dryRun: boolean;
  minAgeHours: number;
  eligible: number;
  drafted: number;
  sent: number;
  skippedTooFresh: number;
  skippedExistingFollowup: number;
  skippedNoGmail: number;
  skippedNoBankerEmail: number;
  skippedNoThread: number;
  failed: number;
  byUser: Record<string, { eligible: number; drafted: number; sent: number; failed: number }>;
  sample?: { subject: string; body: string };
}

interface ConnectionRow {
  id: string;
  user_id: string;
  banker_id: string | null;
  sent_at: string | null;
  updated_at: string;
  thread_id: string | null;
  last_send_message_id: string | null;
  bankers: {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    firm_id: string | null;
    group_id: string | null;
    firms: { name: string | null } | null;
  } | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  name: string;
  university: string;
  graduation_year: number;
  major: string;
  gmail_email: string | null;
}

interface DraftLookupRow {
  user_id: string;
  banker_id: string | null;
  type: string;
  status: string;
  skip_reason: string | null;
  subject: string | null;
  sent_at: string | null;
}

const DEFAULT_MIN_AGE_HOURS = 36;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

function schoolShort(university: string): string {
  const lower = university.toLowerCase();
  if (lower.includes("rice")) return "Rice";
  if (lower.includes("brown")) return "Brown";
  return university.split(/\s+/)[0] ?? university;
}

function graduationShort(year: number): string {
  return String(year).slice(-2);
}

function reSubject(subject: string | null, profile: ProfileRow): string {
  const fallback = `${schoolShort(profile.university)} student - quick question`;
  const clean = sanitizeEmailSubject(subject?.trim() || fallback);
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

function buildFollowupBody(profile: ProfileRow, banker: NonNullable<ConnectionRow["bankers"]>): string {
  const firm = banker.firms?.name ?? banker.firm_id ?? "your group";
  return `Hi ${firstName(banker.name)},

Wanted to follow up on my note below. I'm still trying to understand how analyst work at ${firm} actually looks from the seat, and your perspective would be helpful.

Would 15 minutes sometime this week or next work?

Thanks,
${profile.name}
${schoolShort(profile.university)} '${graduationShort(profile.graduation_year)} | ${profile.major}`;
}

function sentishAt(c: ConnectionRow): Date {
  return new Date(c.sent_at ?? c.updated_at);
}

function keyFor(userId: string, bankerId: string | null): string {
  return `${userId}:${bankerId ?? ""}`;
}

function bump(summary: BatchFollowupSummary, userEmail: string, field: "eligible" | "drafted" | "sent" | "failed") {
  if (!summary.byUser[userEmail]) summary.byUser[userEmail] = { eligible: 0, drafted: 0, sent: 0, failed: 0 };
  summary.byUser[userEmail][field]++;
}

export async function runBatchFollowups(input: BatchFollowupInput = {}): Promise<BatchFollowupSummary> {
  const admin = getAdminClient();
  const minAgeHours = input.minAgeHours ?? DEFAULT_MIN_AGE_HOURS;
  const mode = input.mode ?? "draft";
  const dryRun = input.dryRun ?? false;
  const targetEmails = new Set((input.userEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean));
  const cutoff = Date.now() - minAgeHours * 60 * 60 * 1000;

  const summary: BatchFollowupSummary = {
    mode,
    dryRun,
    minAgeHours,
    eligible: 0,
    drafted: 0,
    sent: 0,
    skippedTooFresh: 0,
    skippedExistingFollowup: 0,
    skippedNoGmail: 0,
    skippedNoBankerEmail: 0,
    skippedNoThread: 0,
    failed: 0,
    byUser: {},
  };

  const { data: connectionData, error: connectionErr } = await admin
    .from("connections")
    .select("id, user_id, banker_id, sent_at, updated_at, thread_id, last_send_message_id, bankers(id, name, title, email, firm_id, group_id, firms(name))")
    .eq("stage", "sent")
    .not("banker_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(500);

  if (connectionErr) throw new Error(`batch followups connection query failed: ${connectionErr.message}`);
  const connections = (connectionData ?? []) as unknown as ConnectionRow[];
  if (connections.length === 0) return summary;

  const userIds = Array.from(new Set(connections.map((c) => c.user_id)));
  const [{ data: profileData, error: profileErr }, { data: draftData, error: draftErr }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, name, university, graduation_year, major, gmail_email")
      .in("id", userIds),
    admin
      .from("drafts")
      .select("user_id, banker_id, type, status, skip_reason, subject, sent_at")
      .in("user_id", userIds)
      .in("type", ["cold", "followup"]),
  ]);

  if (profileErr) throw new Error(`batch followups profile query failed: ${profileErr.message}`);
  if (draftErr) throw new Error(`batch followups draft query failed: ${draftErr.message}`);

  const profiles = new Map((profileData ?? []).map((p) => [p.id, p as ProfileRow]));
  const draftRows = (draftData ?? []) as DraftLookupRow[];
  const existingFollowup = new Set(
    draftRows
      .filter((d) => d.type === "followup")
      .filter(
        (d) =>
          d.status === "sent" ||
          d.skip_reason === "batch_followup_gmail_draft_sync_failed" ||
          (d.sent_at === null && ["pending_critic", "needs_revision", "approved", "sending"].includes(d.status))
      )
      .map((d) => keyFor(d.user_id, d.banker_id))
  );
  const latestColdSubject = new Map<string, { subject: string | null; sentAt: string | null }>();
  for (const d of draftRows) {
    if (d.type !== "cold" || d.status !== "sent") continue;
    const k = keyFor(d.user_id, d.banker_id);
    const prev = latestColdSubject.get(k);
    if (!prev || new Date(d.sent_at ?? 0).getTime() > new Date(prev.sentAt ?? 0).getTime()) {
      latestColdSubject.set(k, { subject: d.subject, sentAt: d.sent_at });
    }
  }

  const eligible = [];
  for (const c of connections) {
    const profile = profiles.get(c.user_id);
    const userEmail = (profile?.email ?? c.user_id).toLowerCase();
    if (targetEmails.size > 0 && !targetEmails.has(userEmail)) continue;
    if (sentishAt(c).getTime() > cutoff) {
      summary.skippedTooFresh++;
      continue;
    }
    if (existingFollowup.has(keyFor(c.user_id, c.banker_id))) {
      summary.skippedExistingFollowup++;
      continue;
    }
    if (!profile?.gmail_email) {
      summary.skippedNoGmail++;
      continue;
    }
    if (!c.bankers?.email) {
      summary.skippedNoBankerEmail++;
      continue;
    }
    if (!c.thread_id || !c.last_send_message_id) {
      summary.skippedNoThread++;
      continue;
    }
    eligible.push({ connection: c, profile, userEmail });
  }

  const capped = typeof input.limit === "number" && input.limit > 0 ? eligible.slice(0, input.limit) : eligible;
  for (const item of capped) {
    summary.eligible++;
    bump(summary, item.userEmail, "eligible");
  }

  if (capped[0]) {
    const original = latestColdSubject.get(keyFor(capped[0].connection.user_id, capped[0].connection.banker_id));
    const guarded = applyGuardrails(buildFollowupBody(capped[0].profile, capped[0].connection.bankers!));
    summary.sample = {
      subject: reSubject(original?.subject ?? null, capped[0].profile),
      body: guarded.body,
    };
  }

  if (dryRun) return summary;

  for (const item of capped) {
    const { connection, profile, userEmail } = item;
    const banker = connection.bankers!;
    const original = latestColdSubject.get(keyFor(connection.user_id, connection.banker_id));
    const guarded = applyGuardrails(buildFollowupBody(profile, banker));
    const subject = reSubject(original?.subject ?? null, profile);

    try {
      const { data: inserted, error: insertErr } = await admin
        .from("drafts")
        .insert({
          user_id: connection.user_id,
          banker_id: connection.banker_id,
          connection_id: connection.id,
          type: "followup",
          subject,
          body: guarded.body,
          guardrail_flags: guarded.flags,
          status: "approved",
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        summary.failed++;
        bump(summary, userEmail, "failed");
        continue;
      }

      await logSignal({
        userId: connection.user_id,
        bankerId: connection.banker_id ?? undefined,
        connectionId: connection.id,
        draftId: inserted.id,
        agent: "planner",
        signalType: "batch_followup_queued",
        metadata: { minAgeHours, mode, guardrailFlags: guarded.flags },
      });

      const gmailDraftId = await ensureGmailDraft(inserted.id);
      if (!gmailDraftId && mode === "draft") {
        await admin
          .from("drafts")
          .update({
            status: "skipped",
            skip_reason: "batch_followup_gmail_draft_sync_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", inserted.id);
        summary.failed++;
        bump(summary, userEmail, "failed");
        continue;
      }

      summary.drafted++;
      bump(summary, userEmail, "drafted");

      if (mode === "send") {
        const sent = await sendDraft({ userId: connection.user_id, draftId: inserted.id, via: "send_all" });
        if (sent.ok && sent.status === "sent") {
          summary.sent++;
          bump(summary, userEmail, "sent");
        } else {
          summary.failed++;
          bump(summary, userEmail, "failed");
        }
      }
    } catch (err) {
      summary.failed++;
      bump(summary, userEmail, "failed");
      await logSignal({
        userId: connection.user_id,
        bankerId: connection.banker_id ?? undefined,
        connectionId: connection.id,
        agent: "planner",
        signalType: "batch_followup_failed",
        metadata: { error: String(err).slice(0, 500), mode },
      });
    }
  }

  return summary;
}
