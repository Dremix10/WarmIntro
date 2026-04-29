"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonToday } from "@/components/Skeleton";

interface FactCheckResult {
  ok: boolean;
  checks: Array<{
    claim: string;
    type: string;
    verdict: "verified" | "unverifiable" | "contradicted";
    evidenceUrls: string[];
    notes: string;
  }>;
}

interface DraftWithBanker {
  id: string;
  banker_id: string | null;
  type: "cold" | "followup" | "reply" | "thank_you";
  subject: string | null;
  body: string;
  status: "pending_critic" | "needs_revision" | "approved" | "rejected_unresolvable" | "sent" | "skipped" | "edited_by_user";
  iteration_count: number;
  scheduled_send_at: string | null;
  fact_check: FactCheckResult | null;
  critic_override: boolean;
  latest_review: { verdict: string; feedback: string | null; overall_score: number; created_at: string } | null;
  iterations: Array<{ iteration: number; subject: string | null; body: string; critic_verdict: string | null; critic_feedback: string | null; critic_score: number | null; created_at: string }>;
  bankers: { name: string; title: string; email: string | null; linkedin_url: string | null; firms: { name: string } | null } | null;
}

interface TrustState {
  send_new_email: "C" | "B" | "A";
  send_followup: "C" | "B" | "A";
  send_reply: "C" | "B" | "A";
  preferred_send_time: string;
  preferred_timezone: string;
  night_preview_enabled: boolean;
  stops_count: number;
  approvals_count_new: number;
  daily_batch_size: number;
}

interface TodayResponse {
  drafts: DraftWithBanker[];
  trust: TrustState | null;
  recent: Array<{ signal_type: string; metadata: Record<string, unknown>; occurred_at: string }>;
  stageCounts: Record<string, number>;
  needsSetup?: boolean;
  needsGmail?: boolean;
}

const TRUST_LABEL: Record<"C" | "B" | "A", string> = {
  C: "Copilot",
  B: "Preview-veto",
  A: "Autopilot",
};

const TRUST_DESCRIPTION: Record<"C" | "B" | "A", string> = {
  C: "I draft everything to your Gmail Drafts folder. You send.",
  B: "I draft, queue, and send 30 minutes later unless you stop me.",
  A: "I draft and send immediately. You see a digest.",
};

const TYPE_LABEL: Record<string, string> = {
  cold: "Cold outreach",
  followup: "Follow-up",
  reply: "Reply",
  thank_you: "Thank-you",
};

// Translate raw signal_type enum values into human sentences. Falls back to
// a tidied version of the enum if no template exists.
function humanSignal(signalType: string, metadata: Record<string, unknown>): string {
  const banker = (metadata?.bankerName as string) ?? (metadata?.banker_name as string) ?? "a banker";
  const firm = (metadata?.firmName as string) ?? (metadata?.firm_name as string) ?? "";
  const subject = (metadata?.subject as string) ?? "";
  switch (signalType) {
    case "draft_created": return `Drafted an email to ${banker}${firm ? ` at ${firm}` : ""}`;
    case "draft_sent": return metadata?.manual ? `You sent your email to ${banker}` : `Sent your email to ${banker}`;
    case "draft_skipped": return `Skipped a draft for ${banker}`;
    case "draft_approved": return `Approved your draft to ${banker}`;
    case "reply_received": return `${banker} replied${subject ? `: "${subject.slice(0, 50)}"` : ""}`;
    case "coffee_booked": return `Coffee booked with ${banker}`;
    case "referral_earned": return `Referral from ${banker}`;
    case "critic_approved": return `Critic green-lit your draft to ${banker}`;
    case "critic_rejected": return `Critic asked for a rewrite on your ${banker} draft`;
    case "critic_rejected_unresolvable_escalated": return `Need your input on the ${banker} draft`;
    case "planner_run_complete": return "Alma finished researching and drafting";
    case "planner_nudge": return "Alma queued more work for next run";
    case "gmail_oauth_expired": return "Gmail token expired — please reconnect";
    case "night_preview_sent": return "Sent you a preview of tomorrow's drafts";
    case "sentinel_run": return ""; // internal, not user-facing
    default: return signalType.replaceAll("_", " ");
  }
}

interface RecentEvent { signal_type: string; metadata: Record<string, unknown>; occurred_at: string }

function groupByDay(events: RecentEvent[]): Array<[string, RecentEvent[]]> {
  const visible = events.filter((e) => humanSignal(e.signal_type, e.metadata).length > 0);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const groups = new Map<string, RecentEvent[]>();
  for (const e of visible) {
    const d = new Date(e.occurred_at);
    const label = sameDay(d, today) ? "Today" : sameDay(d, yesterday) ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }
  return [...groups.entries()];
}

export default function TodayPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentToast, setSentToast] = useState<{ banker: string; firm: string | null } | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/");
      return;
    }
    if (session) load();
    // Use user.id so token refreshes (which create a new session object) don't
    // refetch and flash the loading state every time the tab regains focus.
  }, [session?.user?.id, authLoading]);

  async function load(opts: { silent?: boolean } = {}) {
    if (!session) return;
    // Skeleton flash only on the very first load. Subsequent refreshes
    // (after run-now finishes, after approve/send) keep the existing UI
    // visible and just swap data underneath — much smoother.
    if (!opts.silent) setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch("/api/today", {
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error(`api error ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      // Auto-route incomplete users to /setup on first visit
      if (json.needsSetup) {
        router.replace("/setup");
        return;
      }
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }

  async function act(
    draftId: string,
    action: "approve" | "skip" | "send" | "stop" | "mark_sent",
    payload?: Record<string, unknown>,
    opts: { deferReload?: boolean } = {}
  ): Promise<{ ok: boolean; error?: string }> {
    const { data: { session: s } } = await supabase.auth.getSession();
    let result: { ok: boolean; error?: string } = { ok: true };
    try {
      const res = await fetch(`/api/drafts/${draftId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${s?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        result = { ok: false, error: (json.error as string) ?? `HTTP ${res.status}` };
      }
    } catch (err) {
      result = { ok: false, error: String(err) };
    }
    if (!opts.deferReload) await load({ silent: true });
    return result;
  }

  /** Caller-driven reload — used when the caller wants to animate first */
  async function reload() {
    await load({ silent: true });
  }

  async function updateTrust(field: keyof TrustState, value: string | boolean | number): Promise<void> {
    const { data: { session: s } } = await supabase.auth.getSession();
    const body: Record<string, unknown> = {};
    if (field === "send_new_email") body.sendNewEmail = value;
    else if (field === "send_followup") body.sendFollowup = value;
    else if (field === "send_reply") body.sendReply = value;
    else if (field === "preferred_send_time") body.preferredSendTime = value;
    else if (field === "night_preview_enabled") body.nightPreviewEnabled = value;
    else if (field === "daily_batch_size") body.dailyBatchSize = value;
    await fetch("/api/setup/trust", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load({ silent: true });
  }

  if (authLoading || loading) {
    return <SkeletonToday />;
  }

  if (error) {
    return <div className="max-w-3xl mx-auto py-12 px-6 text-[#C86B4F]">Error loading today: {error}</div>;
  }

  if (!data) return null;

  // Bucket all "user needs to act" drafts together. Escalated drafts
  // (Critic stuck after 3 iterations) are real drafts with real bodies — they
  // need to render through the same DraftCard as needs_revision, just with
  // the "Critic stuck" badge so the user sees the override flow.
  const pending = data.drafts.filter(
    (d) => d.status === "pending_critic" || d.status === "needs_revision" || d.status === "rejected_unresolvable"
  );
  const approved = data.drafts.filter((d) => d.status === "approved");
  // Split active drafts by type so cold outreach and follow-ups visually
  // separate. The user asked for clarity on which is which (some users
  // want to send cold first and bench follow-ups, or vice versa).
  const isFollowup = (t: string) => t === "followup" || t === "reply" || t === "thank_you";
  const approvedCold = approved.filter((d) => !isFollowup(d.type));
  const approvedFollowup = approved.filter((d) => isFollowup(d.type));
  const pendingCold = pending.filter((d) => !isFollowup(d.type));
  const pendingFollowup = pending.filter((d) => isFollowup(d.type));

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Today</p>
            <h1 className="text-4xl font-[family-name:var(--font-fraunces)] font-medium">
              Your queue
            </h1>
            <p className="mt-2 text-sm text-[#14182A]/70">
              {approved.length} ready to send · {pending.length} in review
            </p>
            {/* Anchor jumps — quick navigation between sections */}
            {(approvedCold.length + approvedFollowup.length + pendingCold.length + pendingFollowup.length) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                {approvedCold.length > 0 && <AnchorChip href="#cold-ready" color="#C86B4F">Cold ready · {approvedCold.length}</AnchorChip>}
                {approvedFollowup.length > 0 && <AnchorChip href="#followup-ready" color="#9A7110">Follow-ups · {approvedFollowup.length}</AnchorChip>}
                {pendingCold.length > 0 && <AnchorChip href="#cold-review" color="#2E5A88">In review · {pendingCold.length}</AnchorChip>}
                {pendingFollowup.length > 0 && <AnchorChip href="#followup-review" color="#2E5A88">Follow-ups review · {pendingFollowup.length}</AnchorChip>}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <RunAlmaNowButton onDone={() => load({ silent: true })} />
            {!data.needsGmail && approved.length > 1 && (
              <SendAllButton count={approved.length} onDone={() => load({ silent: true })} />
            )}
          </div>
        </div>

        {/* Gmail-required banner — drafts can't send without Gmail. Show this
            prominently so the user doesn't waste time approving drafts that
            can't go anywhere. */}
        {data.needsGmail && <GmailRequiredBanner />}

        {/* Trust controls */}
        <div className="mb-8 rounded-2xl bg-white p-5 border border-[#D9CFB5]">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold">Trust</p>
            <p className="font-[family-name:var(--font-fraunces)] text-xl mt-0.5">Cold outreach is on {TRUST_LABEL[data.trust?.send_new_email ?? "C"]}</p>
          </div>
          <p className="text-sm text-[#14182A]/70 italic">{TRUST_DESCRIPTION[data.trust?.send_new_email ?? "C"]}</p>
          <div className="mt-4 flex gap-2">
            {(["C", "B", "A"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateTrust("send_new_email", level)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  data.trust?.send_new_email === level
                    ? "bg-[#2E5A88] text-white"
                    : "bg-[#EAE3D2] text-[#14182A]/70 hover:bg-[#D9CFB5]"
                }`}
              >
                {TRUST_LABEL[level]}
              </button>
            ))}
          </div>

          {/* Auto-run controls — batch size + send time. Only relevant when
              the cron actually runs the planner (Preview-veto / Autopilot).
              On Copilot, all drafting is on-demand via Run Alma now, so
              these settings don't apply. */}
          {(data.trust?.send_new_email ?? "C") === "C" ? (
            <div className="mt-4 pt-4 border-t border-[#EAE3D2] text-xs text-[#14182A]/55 italic font-[family-name:var(--font-fraunces)]">
              On Copilot — drafts only when you click <strong>Run Alma now</strong>. Switch to Preview-veto or Autopilot to schedule a daily morning run.
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-[#EAE3D2] grid grid-cols-2 gap-3 text-xs">
              <BatchStepper
                value={Math.min(data.trust?.daily_batch_size ?? 5, 5)}
                onChange={(n) => updateTrust("daily_batch_size", n)}
              />
              <SendTimePicker
                value={(data.trust?.preferred_send_time ?? "08:23").slice(0, 5)}
                onChange={(t) => updateTrust("preferred_send_time", t)}
                disabled={data.needsGmail ?? false}
              />
            </div>
          )}
        </div>

        {/* Pipeline summary */}
        {Object.keys(data.stageCounts).length > 0 && (
          <div className="mb-8 rounded-2xl bg-white p-5 border border-[#D9CFB5]">
            <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-3">Pipeline</p>
            <div className="flex gap-4 text-sm">
              {(["sent", "replied", "coffee", "referral", "first_round", "superday", "offer"] as const).map((stage) => (
                <div key={stage}>
                  <p className="font-[family-name:var(--font-fraunces)] text-2xl">{data.stageCounts[stage] ?? 0}</p>
                  <p className="text-xs text-[#14182A]/60 capitalize">{stage.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Helper to render a draft list — keeps four sections DRY */}
        {(() => {
          const onSent = (banker: string, firm: string | null) => {
            setSentToast({ banker, firm });
            window.setTimeout(() => setSentToast(null), 4000);
          };
          const renderList = (drafts: DraftWithBanker[]) =>
            drafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                onAction={act}
                onReload={reload}
                onSent={onSent}
                trustLevel={data.trust?.send_new_email ?? "C"}
                needsGmail={data.needsGmail ?? false}
              />
            ));

          return (
            <>
              {/* Each section is a card with a colored left rule for visual
                  separation. Sticky-ish header with section name + count. */}
              {approvedCold.length > 0 && (
                <SectionShell id="cold-ready" accent="#C86B4F" title={`Cold outreach · ${data.needsGmail ? "ready (needs Gmail)" : "ready to send"}`} count={approvedCold.length}>
                  {renderList(approvedCold)}
                </SectionShell>
              )}
              {approvedFollowup.length > 0 && (
                <SectionShell id="followup-ready" accent="#E8B339" title="Follow-ups · in your existing threads" count={approvedFollowup.length}>
                  {renderList(approvedFollowup)}
                </SectionShell>
              )}
              {pendingCold.length > 0 && (
                <SectionShell id="cold-review" accent="#2E5A88" title="Cold · in review" count={pendingCold.length}>
                  {renderList(pendingCold)}
                </SectionShell>
              )}
              {pendingFollowup.length > 0 && (
                <SectionShell id="followup-review" accent="#2E5A88" title="Follow-ups · in review" count={pendingFollowup.length}>
                  {renderList(pendingFollowup)}
                </SectionShell>
              )}
            </>
          );
        })()}

        {/* Empty state — RunAlmaNowButton already lives in the page header,
            so we just point to it here. Two buttons that fire the same API
            in parallel was producing duplicate drafts when spam-clicked. */}
        {data.drafts.length === 0 && (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Nothing queued yet.</p>
            <p className="text-sm text-[#14182A]/70">
              Hit <strong>Run Alma now</strong> in the top-right to draft your first email — or wait until {data.trust?.preferred_send_time ?? "07:00"} when it runs automatically.
            </p>
          </div>
        )}

        {/* Recent activity — collapsed by default; the queue is the focus.
            Signals are translated into human sentences so users don't read raw
            "draft_sent" / "reply_received" enum values. */}
        {data.recent.length > 0 && (
          <details className="mt-8 rounded-2xl bg-white p-5 border border-[#D9CFB5] group">
            <summary className="cursor-pointer flex items-center justify-between text-xs uppercase tracking-wider text-[#14182A]/50 font-semibold list-none">
              <span>What Alma did recently · {data.recent.length}</span>
              <span className="text-[#14182A]/40 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="mt-4 space-y-3">
              {groupByDay(data.recent.slice(0, 20)).map(([day, events]) => (
                <div key={day}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/40 font-semibold mb-2">{day}</p>
                  <div className="space-y-1.5">
                    {events.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span aria-hidden className="mt-1 block h-1.5 w-1.5 rounded-full bg-[#2E5A88]/40 shrink-0" />
                        <p className="flex-1 text-[#14182A]/80 leading-tight">
                          {humanSignal(r.signal_type, r.metadata)}
                          <span className="ml-2 text-[10px] text-[#14182A]/40">{new Date(r.occurred_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Success toast — celebrates a successful Gmail send and points the
          user to where the conversation is being tracked. */}
      {sentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sent-toast-enter">
          <div className="rounded-2xl bg-gradient-to-br from-[#1B3B5F] to-[#2E5A88] text-white px-5 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-base">✓</span>
            <div>
              <p className="text-sm font-medium">Sent to {sentToast.banker}{sentToast.firm ? ` at ${sentToast.firm}` : ""}</p>
              <p className="text-xs text-white/80 mt-0.5">
                Watching for replies. Track in <a href="/crm" className="underline hover:text-white">CRM</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  onAction,
  onReload,
  onSent,
  trustLevel,
  needsGmail,
}: {
  draft: DraftWithBanker;
  onAction: (id: string, action: "approve" | "skip" | "send" | "stop" | "mark_sent", payload?: Record<string, unknown>, opts?: { deferReload?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  onReload: () => Promise<void>;
  onSent?: (banker: string, firm: string | null) => void;
  trustLevel: "C" | "B" | "A";
  needsGmail: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [showSentConfirm, setShowSentConfirm] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState(draft.subject ?? "");
  const [editedBody, setEditedBody] = useState(draft.body);
  const [savingEdit, setSavingEdit] = useState(false);
  // Card-level fade-out triggered by sendState=sent for visual confirmation
  // before the data refresh removes it from the queue.
  const [fading, setFading] = useState(false);
  const banker = draft.bankers;

  async function saveEdit(opts: { reload?: boolean } = { reload: true }): Promise<boolean> {
    setSavingEdit(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(`/api/drafts/${draft.id}/edit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editedSubject, body: editedBody }),
      });
      if (!res.ok) return false;
      setEditing(false);
      if (opts.reload) await onReload();
      return true;
    } finally {
      setSavingEdit(false);
    }
  }
  function cancelEdit() {
    setEditedSubject(draft.subject ?? "");
    setEditedBody(draft.body);
    setEditing(false);
  }
  // Flush any unsaved local edits to the server BEFORE sending or copying so
  // what we ship matches what the user sees on screen. Without this, typing
  // into the textarea and then clicking Auto-send / Copy / I sent it would
  // dispatch the stale server-side body. Returns the body+subject that's now
  // canonical (DB matches this, send routes will read it).
  async function ensureSavedBeforeAction(): Promise<{ body: string; subject: string } | null> {
    if (!editing) return { body: draft.body, subject: draft.subject ?? "" };
    const dirty = editedBody !== draft.body || editedSubject !== (draft.subject ?? "");
    if (!dirty) {
      setEditing(false);
      return { body: draft.body, subject: draft.subject ?? "" };
    }
    const ok = await saveEdit({ reload: false });
    if (!ok) return null;
    return { body: editedBody, subject: editedSubject };
  }

  // Visual treatment changes by status so the user knows at a glance whether
  // a draft is ready to send vs still in review.
  const isApproved = draft.status === "approved";
  const isInReview = draft.status === "pending_critic" || draft.status === "needs_revision";
  const isCriticEscalated = draft.status === "rejected_unresolvable";
  const isCriticBlocked = draft.status === "needs_revision" || draft.status === "rejected_unresolvable";
  // Cards fade-and-slide on entry so a newly-approved draft "lands" in the
  // top section instead of blinking. Approved gets a slightly more
  // pronounced animation since it's the moment the user cares about.
  const cardClass = `${
    isApproved
      ? "rounded-2xl bg-white border-2 border-[#2E5A88] overflow-hidden shadow-sm draft-card-enter-emphasis"
      : "rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden draft-card-enter-soft"
  }${fading ? " draft-card-sent-fade" : ""}`;

  async function copyAddress() {
    if (!banker?.email) return;
    await navigator.clipboard.writeText(banker.email);
    setCopiedAddr(true);
    window.setTimeout(() => setCopiedAddr(false), 1500);
  }
  async function copyBody() {
    const flushed = await ensureSavedBeforeAction();
    if (!flushed) return;
    const text = `Subject: ${flushed.subject}\n\n${flushed.body}`;
    await navigator.clipboard.writeText(text);
    setCopiedBody(true);
    window.setTimeout(() => setCopiedBody(false), 1500);
  }

  return (
    <div className={cardClass}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-[#EAE3D2]/30 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{banker?.name ?? "Unknown banker"}</p>
              {banker?.linkedin_url && (
                <a
                  href={banker.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-[#2E5A88] hover:text-[#1B3B5F] underline"
                  title="Open LinkedIn profile in new tab"
                >
                  LinkedIn ↗
                </a>
              )}
            </div>
            <p className="text-xs text-[#14182A]/60">{banker?.title ?? ""}{banker?.firms?.name ? ` · ${banker.firms.name}` : ""}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isApproved && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E5A88] text-white font-semibold uppercase tracking-wider">
                {needsGmail ? "Ready · needs Gmail" : "Ready to send"}
              </span>
            )}
            {isInReview && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8B339]/20 text-[#9A7110] font-semibold uppercase tracking-wider">
                In review
              </span>
            )}
            {isCriticEscalated && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C86B4F]/20 text-[#9A4220] font-semibold uppercase tracking-wider" title="Critic ran 3 revisions and couldn't satisfy itself. Edit, override, or skip.">
                Critic stuck
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAE3D2] text-[#14182A]/60">{TYPE_LABEL[draft.type]}</span>
          </div>
        </div>
        {draft.subject && <p className="text-sm italic text-[#14182A]/70 mt-2 font-[family-name:var(--font-fraunces)]">{draft.subject}</p>}
        {!expanded && <p className="text-xs text-[#14182A]/60 mt-2 line-clamp-2">{draft.body}</p>}
      </button>
      {expanded && (
        <div className="p-4 border-t border-[#D9CFB5]">
          {/* Recipient line — copyable so user can paste into their own client */}
          {banker?.email && (
            <div className="mb-3 flex items-center gap-2 text-xs text-[#14182A]/70">
              <span className="text-[10px] uppercase tracking-wider text-[#14182A]/45">To:</span>
              <code className="font-mono">{banker.email}</code>
              <button
                type="button"
                onClick={copyAddress}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  copiedAddr ? "bg-[#2E5A88] text-white" : "bg-[#EAE3D2] text-[#14182A]/60 hover:bg-[#D9CFB5]"
                }`}
              >
                {copiedAddr ? "copied ✓" : "copy"}
              </button>
            </div>
          )}
          {/* Subject + body — view OR edit. Browser spell-check is on by
              default for both inputs (spellCheck attribute), so red squigglies
              show up natively without an LLM round-trip. */}
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Subject"
                spellCheck
                className="w-full rounded-lg border border-[#D9CFB5] bg-white px-3 py-2 text-sm font-medium focus:border-[#2E5A88] focus:outline-none italic font-[family-name:var(--font-fraunces)]"
              />
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                spellCheck
                rows={Math.max(8, editedBody.split("\n").length + 1)}
                className="w-full rounded-lg border border-[#D9CFB5] bg-white px-3 py-2 text-sm font-[family-name:var(--font-geist-sans)] text-[#14182A] focus:border-[#2E5A88] focus:outline-none whitespace-pre-wrap"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                  className="rounded-lg border border-[#D9CFB5] px-3 py-1.5 text-xs font-medium hover:bg-[#EAE3D2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { void saveEdit(); }}
                  disabled={savingEdit || !editedBody.trim()}
                  className="rounded-lg bg-[#1B3B5F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2E5A88] disabled:opacity-50"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <pre className="text-sm whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[#14182A]/80">{draft.body}</pre>
              <button
                type="button"
                onClick={() => {
                  setEditedSubject(draft.subject ?? "");
                  setEditedBody(draft.body);
                  setEditing(true);
                }}
                className="absolute top-0 right-0 text-[10px] text-[#2E5A88] hover:text-[#1B3B5F] underline opacity-60 hover:opacity-100"
                title="Edit inline (browser spell-check enabled)"
              >
                edit
              </button>
            </div>
          )}

          {/* Fact-check citations — only verified claims surface. Unverified
              ones shouldn't reach the user at all (Critic now rejects drafts
              with any unverified claim), and showing "⚠ Unverified" with
              evidence URLs that *don't* support the claim was confusing —
              looked like we were citing as proof what was actually a miss. */}
          {(() => {
            const verified = draft.fact_check?.checks.filter((c) => c.verdict === "verified") ?? [];
            if (verified.length === 0) return null;
            return (
              <details className="mt-3 rounded-lg bg-[#EAE3D2]/40 border border-[#D9CFB5] p-3 text-xs">
                <summary className="cursor-pointer text-[10px] uppercase tracking-[0.15em] font-semibold text-[#14182A]/60 hover:text-[#2E5A88]">
                  Sources · {verified.length} {verified.length === 1 ? "claim verified" : "claims verified"}
                </summary>
                <div className="mt-3 space-y-2">
                  {verified.map((c, i) => (
                    <div key={i} className="border-l-2 border-[#2E5A88] pl-3 py-1">
                      <p className="text-[#14182A] italic">&ldquo;{c.claim}&rdquo;</p>
                      {c.evidenceUrls.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-[10px]">
                          {c.evidenceUrls.slice(0, 3).map((u, j) => (
                            <li key={j}>
                              <a href={u} target="_blank" rel="noreferrer" className="text-[#2E5A88] underline hover:text-[#1B3B5F] break-all">
                                {u.replace(/^https?:\/\//, "").slice(0, 80)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })()}
          {draft.iterations.length > 1 && (
            <details className="mt-3 rounded-lg bg-[#EAE3D2]/40 border border-[#D9CFB5] p-3 text-xs">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[0.15em] font-semibold text-[#14182A]/60 hover:text-[#2E5A88]">
                Critic history · {draft.iterations.length} attempts
              </summary>
              <div className="mt-3 space-y-3">
                {draft.iterations.map((it) => (
                  <div key={it.iteration} className="rounded-lg bg-white p-3 border border-[#D9CFB5]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#14182A]/55 font-semibold">
                        Iteration {it.iteration}
                      </span>
                      {it.critic_score !== null && (
                        <span className="text-[10px] text-[#C86B4F] font-medium">
                          score {it.critic_score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {it.subject && <p className="font-medium text-[#14182A]/80 italic font-[family-name:var(--font-fraunces)] mb-1">{it.subject}</p>}
                    <pre className="text-[#14182A]/70 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[11px]">{it.body}</pre>
                    {it.critic_feedback && (
                      <p className="mt-2 pt-2 border-t border-[#EAE3D2] text-[#C86B4F] italic">
                        Critic: &ldquo;{it.critic_feedback}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.status === "approved" ? (
              <>
                {/* Always-available manual path: copy the email + mark sent.
                    Works without Gmail OAuth (Rice users, off-domain testers). */}
                <button
                  type="button"
                  onClick={copyBody}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    copiedBody
                      ? "bg-[#2E5A88] text-white border-[#2E5A88]"
                      : "border-[#2E5A88] text-[#2E5A88] hover:bg-[#2E5A88]/10"
                  }`}
                >
                  {copiedBody ? "Copied ✓" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const flushed = await ensureSavedBeforeAction();
                    if (!flushed) return;
                    setShowSentConfirm(true);
                  }}
                  className="rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
                >
                  I sent it
                </button>
                {/* Auto-send via Gmail OAuth — with explicit loading + error states.
                    Earlier the button just silently failed if the Gmail API call
                    rejected, leaving the user confused why nothing happened. */}
                <button
                  type="button"
                  onClick={async () => {
                    setSendState("sending");
                    setSendError(null);
                    // Flush any unsaved textarea edits FIRST so the body in the
                    // DB (which /send reads from) matches what's on screen.
                    const flushed = await ensureSavedBeforeAction();
                    if (!flushed) {
                      setSendState("error");
                      setSendError("Couldn't save your edits — try again");
                      window.setTimeout(() => setSendState("idle"), 5000);
                      return;
                    }
                    // Defer the data reload so we can animate the card out first.
                    const result = await onAction(draft.id, "send", undefined, { deferReload: true });
                    if (result.ok) {
                      setSendState("sent");
                      setFading(true);
                      // Trigger the page-level success toast so the user sees
                      // a celebratory confirmation, not just a card disappearing.
                      onSent?.(banker?.name ?? "the banker", banker?.firms?.name ?? null);
                      // ~900ms fade, then refresh — card naturally exits the
                      // queue because its status is now "sent".
                      window.setTimeout(() => onReload(), 900);
                    } else {
                      setSendState("error");
                      setSendError(result.error ?? "Send failed");
                      window.setTimeout(() => setSendState("idle"), 5000);
                    }
                  }}
                  disabled={needsGmail || sendState === "sending"}
                  title={needsGmail ? "Connect Gmail to enable auto-send" : undefined}
                  className="flex-1 min-w-[140px] rounded-lg bg-[#2E5A88] text-white py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:bg-[#5C6472] disabled:cursor-not-allowed"
                >
                  {needsGmail ? "Auto-send (needs Gmail)"
                    : sendState === "sending" ? "Sending via Gmail…"
                    : sendState === "sent" ? "Sent ✓"
                    : sendState === "error" ? "Retry send"
                    : "Auto-send via Gmail"}
                </button>
                {draft.scheduled_send_at && !needsGmail && (
                  <button
                    type="button"
                    onClick={() => onAction(draft.id, "stop")}
                    className="rounded-lg bg-[#C86B4F] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Stop
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "skip")}
                  className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
                >
                  Skip
                </button>
              </>
            ) : isCriticBlocked ? (
              // Critic rejected (or escalated after 3 failed iterations) —
              // surface the unverified claims and gate approval behind a
              // confirmation modal. Sending anyway is a valid path
              // (sometimes the user knows better than the fact-checker), but
              // it should be a deliberate, audited choice.
              <>
                <button
                  type="button"
                  onClick={() => setShowOverrideConfirm(true)}
                  className="flex-1 rounded-lg bg-[#C86B4F] text-white py-2 text-sm font-medium hover:bg-[#B85939] transition-colors"
                >
                  Send anyway
                </button>
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "skip")}
                  className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
                >
                  Skip
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "approve")}
                  className="flex-1 rounded-lg bg-[#2E5A88] text-white py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
                >
                  {trustLevel === "C" ? "Looks good — make it ready" : trustLevel === "B" ? "Approve (sends in 30 min)" : "Approve + send"}
                </button>
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "skip")}
                  className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
                >
                  Skip
                </button>
              </>
            )}
          </div>
          {draft.scheduled_send_at && !needsGmail && (
            <p className="text-xs text-[#14182A]/50 mt-2 italic">
              Auto-send at {new Date(draft.scheduled_send_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          {draft.scheduled_send_at && needsGmail && (
            <p className="text-xs text-[#C86B4F] mt-2 italic">
              Was scheduled for {new Date(draft.scheduled_send_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — paused until Gmail is connected.
            </p>
          )}
          {sendError && (
            <div className="mt-3 rounded-lg bg-[#C86B4F]/10 border border-[#C86B4F]/30 px-3 py-2 text-xs text-[#C86B4F]">
              <strong>Send failed:</strong> {sendError}
              {sendError.toLowerCase().includes("gmail") || sendError === "send_failed" ? (
                <span className="block mt-0.5">Try reconnecting Gmail at <a href="/account" className="underline">/account</a>, or use the &quot;I sent it&quot; manual path.</span>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Branded "mark as sent" confirmation — replaces the browser confirm() */}
      {showSentConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#14182A]/40 backdrop-blur-sm"
          onClick={() => setShowSentConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D9CFB5] max-w-sm w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold mb-1">Confirm</p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Mark this email as sent?</h3>
            <p className="text-sm text-[#14182A]/70 mb-5">
              Alma will move <strong>{banker?.name ?? "this banker"}</strong> into your pipeline at the &ldquo;Email sent&rdquo; stage. You should have already pasted + sent the email from your inbox.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSentConfirm(false)}
                className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSentConfirm(false);
                  onAction(draft.id, "mark_sent");
                }}
                className="rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
              >
                Yes, I sent it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critic-override confirmation. Shown when the user clicks
          "Send anyway" on a needs_revision draft. Lists every fact-check
          claim Critic flagged so the user knows what they're overriding. */}
      {showOverrideConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#14182A]/40 backdrop-blur-sm"
          onClick={() => setShowOverrideConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#C86B4F]/40 max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold mb-1">Override Critic</p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Send despite Critic flag?</h3>
            <p className="text-sm text-[#14182A]/70 mb-3">
              Sending anyway is fine if you know the email is right — the override is recorded so we can learn from these.
            </p>
            {draft.latest_review?.feedback && (
              <div className="mb-3 rounded-lg bg-[#EAE3D2]/40 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50 font-semibold mb-1">
                  Critic feedback (score {Number(draft.latest_review.overall_score).toFixed(2)} / 10)
                </p>
                <p className="text-[#14182A] italic">&ldquo;{draft.latest_review.feedback}&rdquo;</p>
              </div>
            )}
            {(() => {
              const flagged = draft.fact_check?.checks.filter((c) => c.verdict !== "verified") ?? [];
              if (flagged.length === 0) return null;
              return (
                <ul className="text-xs space-y-2 mb-4 bg-[#EAE3D2]/40 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50 font-semibold mb-1">Unverifiable claims</p>
                  {flagged.map((c, i) => (
                    <li key={i} className="border-l-2 border-[#C86B4F] pl-2">
                      <p className="text-[#14182A]"><span className="text-[#C86B4F] font-semibold uppercase tracking-wider text-[10px]">{c.verdict}:</span> &ldquo;{c.claim}&rdquo;</p>
                      {c.notes && <p className="text-[#14182A]/55 mt-0.5">{c.notes}</p>}
                    </li>
                  ))}
                </ul>
              );
            })()}
            {draft.iterations.length > 1 && (
              <details className="mb-4 text-xs">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-[#14182A]/55 hover:text-[#2E5A88] font-semibold">
                  See all {draft.iterations.length} rejected versions
                </summary>
                <div className="mt-2 space-y-3">
                  {draft.iterations.map((it) => (
                    <div key={it.iteration} className="rounded-lg bg-[#EAE3D2]/30 p-3 border border-[#D9CFB5]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#14182A]/55 font-semibold">
                          Iteration {it.iteration}
                        </span>
                        {it.critic_score !== null && (
                          <span className="text-[10px] text-[#C86B4F] font-medium">
                            score {it.critic_score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {it.subject && <p className="font-medium text-[#14182A]/80 italic font-[family-name:var(--font-fraunces)] mb-1">{it.subject}</p>}
                      <pre className="text-[#14182A]/70 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[11px]">{it.body}</pre>
                      {it.critic_feedback && (
                        <p className="mt-2 pt-2 border-t border-[#D9CFB5] text-[#C86B4F] italic">
                          Critic: &ldquo;{it.critic_feedback}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(false)}
                className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOverrideConfirm(false);
                  onAction(draft.id, "approve", { override: true });
                }}
                className="rounded-lg bg-[#C86B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#B85939] transition-colors"
              >
                Override + approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SendAllButton({ count, onDone }: { count: number; onDone: () => void | Promise<void> }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={state === "sending"}
        onClick={async () => {
          if (!confirm(`Send all ${Math.min(count, 5)} approved drafts via Gmail right now? This batch caps at 5; rerun for more.`)) return;
          setState("sending");
          setSummary(null);
          try {
            const { data: { session: s } } = await supabase.auth.getSession();
            const res = await fetch("/api/drafts/send-all", {
              method: "POST",
              headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
              setState("error");
              setSummary((json.error as string) ?? `HTTP ${res.status}`);
            } else {
              setState("done");
              const sent = json.sent as number ?? 0;
              const failed = json.failed as number ?? 0;
              setSummary(`${sent} sent${failed > 0 ? `, ${failed} failed` : ""}`);
            }
            await onDone();
            window.setTimeout(() => { setState("idle"); setSummary(null); }, 5000);
          } catch (err) {
            setState("error");
            setSummary(String(err));
          }
        }}
        className="rounded-xl bg-[#1B3B5F] text-white px-3 py-1.5 text-[11px] font-medium hover:bg-[#2E5A88] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {state === "sending" ? "Sending…" : state === "done" ? `Sent ✓` : state === "error" ? "Retry" : `Send all ${count} →`}
      </button>
      {summary && (
        <p className={`mt-1 text-[10px] ${state === "error" ? "text-[#C86B4F]" : "text-[#14182A]/50"} italic max-w-[160px] text-right`}>
          {summary}
        </p>
      )}
    </div>
  );
}

// Custom number stepper — replaces the native <input type=number> whose
// browser stepper buttons feel old + the controlled-input race that made
// typing not commit. Local state for typing UX; commits on each step or
// on blur. Range 1-5 (Vercel function timeout caps the planner at 5).
function BatchStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  function clampAndCommit(raw: string) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) { setLocal(String(value)); return; }
    const clamped = Math.max(1, Math.min(5, n));
    setLocal(String(clamped));
    if (clamped !== value) onChange(clamped);
  }
  function step(delta: number) {
    const n = Math.max(1, Math.min(5, value + delta));
    if (n !== value) onChange(n);
  }
  return (
    <div>
      <label htmlFor="batch-size" className="block text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 font-semibold mb-1.5">
        Drafts each morning
      </label>
      <div className="flex items-stretch rounded-lg border border-[#D9CFB5] bg-white overflow-hidden focus-within:border-[#2E5A88] transition-colors">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= 1}
          aria-label="Decrease"
          className="w-9 text-[#14182A] hover:bg-[#EAE3D2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none flex items-center justify-center"
        >−</button>
        <input
          id="batch-size"
          type="text"
          inputMode="numeric"
          value={local}
          onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, "").slice(0, 1))}
          onBlur={(e) => clampAndCommit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 text-center text-sm font-medium tabular-nums focus:outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= 5}
          aria-label="Increase"
          className="w-9 text-[#14182A] hover:bg-[#EAE3D2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none flex items-center justify-center"
        >+</button>
      </div>
    </div>
  );
}

function SendTimePicker({ value, onChange, disabled }: { value: string; onChange: (t: string) => void; disabled: boolean }) {
  // Branded time picker — uses native <input type=time> for the wheel UX
  // but styled to match the rest. Disabled state = grayed out, not
  // line-through (line-through reads as "this happened and was struck",
  // which doesn't fit a future time).
  return (
    <div>
      <label htmlFor="send-time" className="block text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 font-semibold mb-1.5">
        Send time{disabled && <span className="text-[#C86B4F] ml-1">· connect Gmail first</span>}
      </label>
      <input
        id="send-time"
        type="time"
        value={value}
        onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
        disabled={disabled}
        className={`w-full rounded-lg border bg-white px-3 py-1.5 text-sm font-medium tabular-nums focus:outline-none transition-colors ${
          disabled
            ? "border-[#EAE3D2] text-[#14182A]/35 cursor-not-allowed"
            : "border-[#D9CFB5] text-[#14182A] focus:border-[#2E5A88] hover:border-[#2E5A88]/60"
        }`}
      />
    </div>
  );
}

function AnchorChip({ href, color, children }: { href: string; color: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full px-2.5 py-1 font-medium hover:bg-white/60 transition-colors"
      style={{ color, border: `1px solid ${color}30`, background: `${color}10` }}
    >
      {children}
    </a>
  );
}

function SectionShell({ id, accent, title, count, children }: {
  id: string;
  accent: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-6 rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden scroll-mt-20"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <header className="px-5 py-3 border-b border-[#D9CFB5] flex items-center justify-between gap-3 bg-[#EAE3D2]/30">
        <h2 className="text-xs uppercase tracking-wider font-semibold" style={{ color: accent }}>
          {title}
        </h2>
        <span className="text-[10px] tabular-nums text-[#14182A]/50">{count}</span>
      </header>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  );
}

function GmailRequiredBanner() {
  const [pending, setPending] = useState(false);
  async function start() {
    setPending(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/gmail/start", {
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
      });
      if (!res.ok) return;
      const { url } = await res.json();
      if (!url) return;
      // Match /setup behavior: open in a new tab. Setup-page popup handler
      // closes itself on completion; the user comes back to /today and can
      // refresh manually. (We can't postMessage between unrelated tabs.)
      window.open(url, "_blank");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mb-6 rounded-2xl border-2 border-[#C86B4F]/30 bg-[#C86B4F]/5 px-5 py-4 flex items-start gap-3">
      <span aria-hidden className="text-lg leading-none mt-0.5">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium">Gmail not connected — Alma can&apos;t actually send.</p>
        <p className="text-xs text-[#14182A]/70 mt-0.5">
          Drafts below are real, but they&apos;ll sit here until you connect the mailbox they should send from.
        </p>
      </div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="shrink-0 rounded-lg bg-[#2E5A88] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-60"
      >
        {pending ? "Opening…" : "Connect Gmail"}
      </button>
    </div>
  );
}

// User-facing copy for run-now stages. Avoid exposing the internal agent
// architecture (Researcher / Correspondent / Critic) — that's IP. Just say
// what the user gets at each beat.
const RUN_STAGES: Array<{ text: string; sub: string; afterMs: number }> = [
  { text: "Finding the right alumni…", sub: "At your target firms. Ranking by school, group, and role.", afterMs: 0 },
  { text: "Writing a personal email…", sub: "In your voice. Pulling real common ground.", afterMs: 8000 },
  { text: "Polishing it…", sub: "Tightening tone. Cutting anything that sounds generic.", afterMs: 22000 },
  { text: "Almost there…", sub: "Adding it to your queue below.", afterMs: 38000 },
];

const MAX_BATCH_DRAFTS = 5;

function RunAlmaNowButton({ onDone }: { onDone: () => Promise<void> | void }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error" | "queue_full">("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [progress, setProgress] = useState({ done: 0, total: 1 });

  return (
    <div
      className="shrink-0 flex flex-col items-end relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Batch slider — generate 1-5 drafts in one click. Each runs serially
          so the dedup picks a different banker each time. */}
      {state === "idle" && (
        <div className="mb-1.5 flex items-center gap-2 text-[10px] text-[#14182A]/60">
          <label htmlFor="batch-size">Batch:</label>
          <input
            id="batch-size"
            type="range"
            min={1}
            max={MAX_BATCH_DRAFTS}
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
            className="w-20 accent-[#2E5A88] cursor-pointer"
          />
          <span className="font-semibold text-[#14182A] tabular-nums">{batchSize}</span>
        </div>
      )}
      <button
        type="button"
        disabled={state === "running"}
        onClick={async () => {
          setState("running");
          setStageIdx(0);
          setProgress({ done: 0, total: batchSize });
          // Per-call stage timers (only meaningful for batch=1; for batches we
          // reset stages each iteration).
          let timers: number[] = [];
          const startStageTimers = () => {
            timers.forEach((t) => window.clearTimeout(t));
            setStageIdx(0);
            timers = RUN_STAGES.slice(1).map((stage, i) =>
              window.setTimeout(() => setStageIdx(i + 1), stage.afterMs)
            );
          };
          try {
            const { data: { session: s } } = await supabase.auth.getSession();
            const auth = { Authorization: `Bearer ${s?.access_token ?? ""}` };
            let queueWasFull = false;
            for (let i = 0; i < batchSize; i++) {
              startStageTimers();
              const res = await fetch("/api/planner/run-now", { method: "POST", headers: auth });
              const json = await res.json().catch(() => ({}));
              if (json?.result?.needsSetup) {
                window.location.href = "/setup";
                return;
              }
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              if (json?.result?.queueFull) {
                queueWasFull = true;
                break;
              }
              setProgress({ done: i + 1, total: batchSize });
              if (i < batchSize - 1) await new Promise((r) => setTimeout(r, 800));
            }
            timers.forEach((t) => window.clearTimeout(t));
            setState(queueWasFull ? "queue_full" : "done");
            await onDone();
            setTimeout(() => setState("idle"), queueWasFull ? 6000 : 2500);
          } catch {
            timers.forEach((t) => window.clearTimeout(t));
            setState("error");
            setTimeout(() => setState("idle"), 2500);
          }
        }}
        className="rounded-xl bg-[#2E5A88] text-white px-4 py-2 text-xs font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-80 whitespace-nowrap min-w-[120px]"
      >
        {state === "running"
          ? `Running ${progress.done}/${progress.total}…`
          : state === "done"
            ? `Done ✓`
            : state === "queue_full"
              ? "Queue full"
              : state === "error"
                ? "Retry"
                : batchSize === 1
                  ? "Run Alma now"
                  : `Draft ${batchSize} emails`}
      </button>
      {state === "queue_full" && (
        <p className="mt-1 max-w-[200px] text-right text-[10px] text-[#C86B4F] italic leading-snug">
          Approve or skip a draft below first — your queue is at the cap.
        </p>
      )}

      {/* Idle: short subtitle. Hover: full explainer card. */}
      {state === "idle" && !hovered && (
        <p className="mt-1 text-[10px] text-[#14182A]/50 italic max-w-[140px] text-right leading-snug">
          Find alumni + draft 1 email. ~30s.
        </p>
      )}
      {state === "idle" && hovered && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-72 rounded-xl bg-white border border-[#D9CFB5] shadow-lg p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-2">What you&apos;ll get</p>
          <p className="text-xs text-[#14182A]/80 mb-2">
            One personalized cold email — drafted to a real banker at one of your target firms, picked because of overlap with your background.
          </p>
          <p className="text-xs text-[#14182A]/80">
            It lands in your queue below. <strong>Nothing sends without your approval.</strong>
          </p>
          <p className="mt-3 text-[10px] text-[#14182A]/50 italic">Takes 20–40 seconds.</p>
        </div>
      )}

      {/* Running: progressive status */}
      {state === "running" && (
        <div className="mt-1 max-w-[200px] text-right">
          <p className="text-[11px] text-[#2E5A88] font-medium leading-tight">{RUN_STAGES[stageIdx].text}</p>
          <p className="text-[10px] text-[#14182A]/50 italic leading-snug mt-0.5">{RUN_STAGES[stageIdx].sub}</p>
        </div>
      )}
    </div>
  );
}
