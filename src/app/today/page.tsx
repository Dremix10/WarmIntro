"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonToday } from "@/components/Skeleton";

interface DraftWithBanker {
  id: string;
  banker_id: string | null;
  type: "cold" | "followup" | "reply" | "thank_you";
  subject: string | null;
  body: string;
  status: "pending_critic" | "needs_revision" | "approved" | "rejected_unresolvable" | "sent" | "skipped" | "edited_by_user";
  iteration_count: number;
  scheduled_send_at: string | null;
  bankers: { name: string; title: string; email: string | null; firms: { name: string } | null } | null;
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

export default function TodayPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function act(draftId: string, action: "approve" | "skip" | "send" | "stop" | "mark_sent", payload?: Record<string, unknown>) {
    const { data: { session: s } } = await supabase.auth.getSession();
    await fetch(`/api/drafts/${draftId}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    await load({ silent: true });
  }

  async function updateTrust(field: keyof TrustState, value: string | boolean): Promise<void> {
    const { data: { session: s } } = await supabase.auth.getSession();
    const body: Record<string, unknown> = {};
    if (field === "send_new_email") body.sendNewEmail = value;
    else if (field === "send_followup") body.sendFollowup = value;
    else if (field === "send_reply") body.sendReply = value;
    else if (field === "preferred_send_time") body.preferredSendTime = value;
    else if (field === "night_preview_enabled") body.nightPreviewEnabled = value;
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

  const pending = data.drafts.filter((d) => d.status === "pending_critic" || d.status === "needs_revision");
  const approved = data.drafts.filter((d) => d.status === "approved");
  const escalated = data.drafts.filter((d) => d.status === "rejected_unresolvable");

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
              {approved.length} ready to send · {pending.length} in review · {escalated.length} need data
            </p>
          </div>

          <RunAlmaNowButton onDone={() => load({ silent: true })} />
        </div>

        {/* Gmail-required banner — drafts can't send without Gmail. Show this
            prominently so the user doesn't waste time approving drafts that
            can't go anywhere. */}
        {data.needsGmail && <GmailRequiredBanner />}

        {/* Trust controls */}
        <div className="mb-8 rounded-2xl bg-white p-5 border border-[#D9CFB5]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold">Trust</p>
              <p className="font-[family-name:var(--font-fraunces)] text-xl mt-0.5">Cold outreach is on {TRUST_LABEL[data.trust?.send_new_email ?? "C"]}</p>
            </div>
            <div className="text-xs text-[#14182A]/60 text-right">
              {data.needsGmail ? "Will send at" : "Send time"}<br />
              <strong className={data.needsGmail ? "text-[#14182A]/40 line-through" : "text-[#14182A]"}>
                {data.trust?.preferred_send_time ?? "07:00"}
              </strong>
              {data.needsGmail && (
                <p className="text-[10px] text-[#C86B4F] not-italic mt-0.5">No mailbox yet</p>
              )}
            </div>
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

        {/* Approved */}
        {approved.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-3">
              {data.needsGmail ? "Ready — but blocked on Gmail" : "Ready to send"}
            </h2>
            <div className="space-y-3">
              {approved.map((d) => (
                <DraftCard key={d.id} draft={d} onAction={act} trustLevel={data.trust?.send_new_email ?? "C"} needsGmail={data.needsGmail ?? false} />
              ))}
            </div>
          </section>
        )}

        {/* Pending / needs revision */}
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-3">In review</h2>
            <div className="space-y-3">
              {pending.map((d) => (
                <DraftCard key={d.id} draft={d} onAction={act} trustLevel={data.trust?.send_new_email ?? "C"} needsGmail={data.needsGmail ?? false} />
              ))}
            </div>
          </section>
        )}

        {/* Escalated */}
        {escalated.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-[#14182A]/40 font-semibold mb-3">Need more data</h2>
            <div className="space-y-3">
              {escalated.map((d) => (
                <div key={d.id} className="rounded-2xl bg-white p-4 border border-[#D9CFB5] opacity-70">
                  <p className="text-sm">
                    Critic rejected this draft 3 times. Researcher will enrich the banker and retry this week.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {data.drafts.length === 0 && (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Nothing queued yet.</p>
            <p className="text-sm text-[#14182A]/70 mb-5">
              Alma is researching bankers based on your target firms. New drafts land here around {data.trust?.preferred_send_time ?? "07:00"}.
            </p>
            <button
              type="button"
              onClick={async () => {
                const { data: { session: s } } = await supabase.auth.getSession();
                const res = await fetch("/api/planner/run-now", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
                });
                const json = await res.json().catch(() => ({}));
                if (json?.result?.needsSetup) {
                  window.location.href = "/setup";
                  return;
                }
                if (res.ok) load();
              }}
              className="rounded-xl bg-[#2E5A88] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
            >
              Run Alma now
            </button>
            <p className="mt-3 text-[10px] text-[#14182A]/40 italic">Kicks off Researcher + Correspondent immediately. Takes 20-60 sec.</p>
          </div>
        )}

        {/* Recent activity — collapsed by default; the queue is the focus. */}
        {data.recent.length > 0 && (
          <details className="mt-8 rounded-2xl bg-white/60 p-5 border border-[#D9CFB5] group">
            <summary className="cursor-pointer flex items-center justify-between text-xs uppercase tracking-wider text-[#14182A]/50 font-semibold list-none">
              <span>Recent activity ({data.recent.length})</span>
              <span className="text-[#14182A]/40 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="space-y-1 text-xs text-[#14182A]/70 mt-3">
              {data.recent.slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="truncate">{r.signal_type.replaceAll("_", " ")}</span>
                  <span className="text-[#14182A]/40 shrink-0">{new Date(r.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onAction,
  trustLevel,
  needsGmail,
}: {
  draft: DraftWithBanker;
  onAction: (id: string, action: "approve" | "skip" | "send" | "stop" | "mark_sent", payload?: Record<string, unknown>) => Promise<void>;
  trustLevel: "C" | "B" | "A";
  needsGmail: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const banker = draft.bankers;

  // Visual treatment changes by status so the user knows at a glance whether
  // a draft is ready to send vs still in review.
  const isApproved = draft.status === "approved";
  const isInReview = draft.status === "pending_critic" || draft.status === "needs_revision";
  const cardClass = isApproved
    ? "rounded-2xl bg-white border-2 border-[#2E5A88] overflow-hidden shadow-sm"
    : "rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden";

  return (
    <div className={cardClass}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-[#EAE3D2]/30 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{banker?.name ?? "Unknown banker"}</p>
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
                onClick={() => navigator.clipboard.writeText(banker.email ?? "")}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#EAE3D2] text-[#14182A]/60 hover:bg-[#D9CFB5]"
                title="Copy address"
              >
                copy
              </button>
            </div>
          )}
          <pre className="text-sm whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[#14182A]/80">{draft.body}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.status === "approved" ? (
              <>
                {/* Always-available manual path: copy the email + mark sent.
                    Works without Gmail OAuth (Rice users, off-domain testers). */}
                <button
                  type="button"
                  onClick={async () => {
                    const text = `Subject: ${draft.subject ?? ""}\n\n${draft.body}`;
                    await navigator.clipboard.writeText(text);
                  }}
                  className="rounded-lg border border-[#2E5A88] text-[#2E5A88] px-4 py-2 text-sm font-medium hover:bg-[#2E5A88]/10 transition-colors"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Mark as sent? This advances the pipeline as if you'd sent it.")) {
                      onAction(draft.id, "mark_sent");
                    }
                  }}
                  className="rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
                >
                  I sent it
                </button>
                {/* Auto-send via Gmail OAuth — only useful if Gmail is wired up */}
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "send")}
                  disabled={needsGmail}
                  title={needsGmail ? "Connect Gmail to enable auto-send" : undefined}
                  className="flex-1 min-w-[140px] rounded-lg bg-[#2E5A88] text-white py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:bg-[#5C6472] disabled:cursor-not-allowed"
                >
                  {needsGmail ? "Auto-send (needs Gmail)" : "Auto-send via Gmail"}
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
        </div>
      )}
    </div>
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

function RunAlmaNowButton({ onDone }: { onDone: () => Promise<void> | void }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="shrink-0 flex flex-col items-end relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        disabled={state === "running"}
        onClick={async () => {
          setState("running");
          setStageIdx(0);
          // Schedule progressive stage transitions.
          const timers = RUN_STAGES.slice(1).map((stage, i) =>
            window.setTimeout(() => setStageIdx(i + 1), stage.afterMs)
          );
          try {
            const { data: { session: s } } = await supabase.auth.getSession();
            const res = await fetch("/api/planner/run-now", {
              method: "POST",
              headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
            });
            const json = await res.json().catch(() => ({}));
            timers.forEach((t) => window.clearTimeout(t));
            if (json?.result?.needsSetup) {
              window.location.href = "/setup";
              return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setState("done");
            await onDone();
            setTimeout(() => setState("idle"), 2500);
          } catch {
            timers.forEach((t) => window.clearTimeout(t));
            setState("error");
            setTimeout(() => setState("idle"), 2500);
          }
        }}
        className="rounded-xl bg-[#2E5A88] text-white px-4 py-2 text-xs font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-80 whitespace-nowrap min-w-[120px]"
      >
        {state === "running"
          ? "Running…"
          : state === "done"
            ? "Done ✓"
            : state === "error"
              ? "Retry"
              : "Run Alma now"}
      </button>

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
