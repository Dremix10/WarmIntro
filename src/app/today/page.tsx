"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";

interface DraftWithBanker {
  id: string;
  banker_id: string | null;
  type: "cold" | "followup" | "reply" | "thank_you";
  subject: string | null;
  body: string;
  status: "pending_critic" | "needs_revision" | "approved" | "rejected_unresolvable" | "sent" | "skipped" | "edited_by_user";
  iteration_count: number;
  scheduled_send_at: string | null;
  bankers: { name: string; title: string; firms: { name: string } | null } | null;
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
  }, [session, authLoading]);

  async function load() {
    if (!session) return;
    setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch("/api/today", {
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error(`api error ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function act(draftId: string, action: "approve" | "skip" | "send" | "stop", payload?: Record<string, unknown>) {
    const { data: { session: s } } = await supabase.auth.getSession();
    await fetch(`/api/drafts/${draftId}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    await load();
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
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="max-w-3xl mx-auto py-12 px-6 text-[#C86B4F]">Error loading today: {error}</div>;
  }

  if (!data) return null;

  const pending = data.drafts.filter((d) => d.status === "pending_critic" || d.status === "needs_revision");
  const approved = data.drafts.filter((d) => d.status === "approved");
  const escalated = data.drafts.filter((d) => d.status === "rejected_unresolvable");

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Today</p>
          <h1 className="text-4xl font-[family-name:var(--font-fraunces)] font-medium">
            Your queue
          </h1>
          <p className="mt-2 text-sm text-[#14182A]/70">
            {approved.length} ready to send · {pending.length} in review · {escalated.length} need data
          </p>
        </div>

        {/* Trust controls */}
        <div className="mb-8 rounded-2xl bg-white p-5 border border-[#D9CFB5]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold">Trust</p>
              <p className="font-[family-name:var(--font-fraunces)] text-xl mt-0.5">Cold outreach is on {TRUST_LABEL[data.trust?.send_new_email ?? "C"]}</p>
            </div>
            <div className="text-xs text-[#14182A]/60 text-right">
              Send time<br />
              <strong className="text-[#14182A]">{data.trust?.preferred_send_time ?? "07:00"}</strong>
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
            <h2 className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-3">Ready to send</h2>
            <div className="space-y-3">
              {approved.map((d) => (
                <DraftCard key={d.id} draft={d} onAction={act} trustLevel={data.trust?.send_new_email ?? "C"} />
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
                <DraftCard key={d.id} draft={d} onAction={act} trustLevel={data.trust?.send_new_email ?? "C"} />
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
            <p className="text-sm text-[#14182A]/70">
              Alma is researching bankers based on your target firms. New drafts land here around {data.trust?.preferred_send_time ?? "07:00"}.
            </p>
          </div>
        )}

        {/* Recent activity */}
        {data.recent.length > 0 && (
          <div className="mt-8 rounded-2xl bg-white/60 p-5 border border-[#D9CFB5]">
            <p className="text-xs uppercase tracking-wider text-[#14182A]/50 font-semibold mb-3">Recent</p>
            <div className="space-y-1 text-xs text-[#14182A]/70">
              {data.recent.slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="truncate">{r.signal_type.replaceAll("_", " ")}</span>
                  <span className="text-[#14182A]/40 shrink-0">{new Date(r.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onAction,
  trustLevel,
}: {
  draft: DraftWithBanker;
  onAction: (id: string, action: "approve" | "skip" | "send" | "stop", payload?: Record<string, unknown>) => Promise<void>;
  trustLevel: "C" | "B" | "A";
}) {
  const [expanded, setExpanded] = useState(false);
  const banker = draft.bankers;

  return (
    <div className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-[#EAE3D2]/30 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="font-medium text-sm">{banker?.name ?? "Unknown banker"}</p>
            <p className="text-xs text-[#14182A]/60">{banker?.title ?? ""}{banker?.firms?.name ? ` · ${banker.firms.name}` : ""}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAE3D2] text-[#14182A]/70 shrink-0">{TYPE_LABEL[draft.type]}</span>
        </div>
        {draft.subject && <p className="text-sm italic text-[#14182A]/70 mt-2 font-[family-name:var(--font-fraunces)]">{draft.subject}</p>}
        {!expanded && <p className="text-xs text-[#14182A]/60 mt-2 line-clamp-2">{draft.body}</p>}
      </button>
      {expanded && (
        <div className="p-4 border-t border-[#D9CFB5]">
          <pre className="text-sm whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[#14182A]/80">{draft.body}</pre>
          <div className="mt-4 flex gap-2">
            {draft.status === "approved" ? (
              <>
                <button
                  type="button"
                  onClick={() => onAction(draft.id, "send")}
                  className="flex-1 rounded-lg bg-[#2E5A88] text-white py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
                >
                  Send now
                </button>
                {draft.scheduled_send_at && (
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
                  {trustLevel === "C" ? "Approve + save to Gmail" : trustLevel === "B" ? "Approve (sends in 30 min)" : "Approve + send"}
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
          {draft.scheduled_send_at && (
            <p className="text-xs text-[#14182A]/50 mt-2 italic">
              Auto-send at {new Date(draft.scheduled_send_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
