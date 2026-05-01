"use client";

// /admin/drafts — prompt-iteration scratchpad. Lists the last N drafts
// across all users with banker, type, critic verdict + score + axes,
// edit-distance from AI to sent body, and skip reason. Click a row to
// expand the full draft + critic feedback. Each expanded card has a
// "Copy for prompt tuning" button that puts a structured block onto
// the clipboard so we can paste it into a prompt-iteration session.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";

interface CriticData {
  verdict: string;
  overallScore: number | null;
  scores: { guardrails?: number; voiceMatch?: number; specificity?: number; sharedGround?: number } | null;
  feedback: string | null;
}

interface DraftItem {
  id: string;
  userEmail: string | null;
  type: string;
  status: string;
  iterationCount: number;
  banker: { name: string; title: string | null } | null;
  firm: string | null;
  subject: string | null;
  body: string;
  preEditAiBody: string | null;
  userEditedBody: string | null;
  editPct: number | null;
  skipReason: string | null;
  createdAt: string;
  critic: CriticData | null;
}

type FilterMode = "all" | "rejected" | "skipped" | "approved" | "sent";

function statusColor(status: string): string {
  if (status === "sent") return "bg-[#2E5A88]/15 text-[#2E5A88]";
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "skipped") return "bg-[#C86B4F]/15 text-[#C86B4F]";
  if (status === "rejected_unresolvable") return "bg-rose-100 text-rose-700";
  if (status === "needs_revision") return "bg-amber-100 text-amber-700";
  return "bg-[#EAE3D2] text-[#14182A]/60";
}

function scoreColor(s: number | null): string {
  if (s == null) return "bg-[#EAE3D2] text-[#14182A]/40";
  if (s >= 8) return "bg-emerald-100 text-emerald-700";
  if (s >= 6.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default function AdminDraftsPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/recent-drafts?limit=80", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (res.status === 403) { setError("Not an admin email."); setLoading(false); return; }
    if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyForTuning(item: DraftItem) {
    const block = [
      `# Draft ${item.id.slice(0, 8)} · ${item.type} · ${item.status}`,
      `User: ${item.userEmail ?? "(unknown)"}`,
      item.banker ? `Banker: ${item.banker.name}${item.banker.title ? `, ${item.banker.title}` : ""}${item.firm ? ` @ ${item.firm}` : ""}` : "Banker: (unknown)",
      `Iterations: ${item.iterationCount}`,
      ``,
      `## Subject`,
      item.subject ?? "(no subject)",
      ``,
      `## Body (final)`,
      item.body,
      item.preEditAiBody && item.preEditAiBody !== item.body ? `\n## Pre-edit AI body\n${item.preEditAiBody}` : "",
      ``,
      `## Critic`,
      item.critic
        ? `verdict=${item.critic.verdict} score=${item.critic.overallScore ?? "—"}\nscores=${JSON.stringify(item.critic.scores)}\nfeedback:\n${item.critic.feedback ?? "(none)"}`
        : "(no review)",
      item.skipReason ? `\n## User skip reason\n${item.skipReason}` : "",
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(block);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = items.filter((it) => {
    if (filter === "all") return true;
    if (filter === "rejected") return it.critic?.verdict === "reject" || it.status === "rejected_unresolvable";
    if (filter === "skipped") return it.status === "skipped";
    if (filter === "approved") return it.status === "approved" || it.status === "sent";
    if (filter === "sent") return it.status === "sent";
    return true;
  });

  if (authLoading || loading) {
    return <div className="min-h-screen bg-[#EAE3D2] flex items-center justify-center text-[#14182A]/55 text-sm">loading drafts…</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-[#EAE3D2] flex items-center justify-center text-[#C86B4F] text-sm">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-1">Admin · prompt iteration</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Recent drafts</h1>
        <p className="text-sm text-[#14182A]/65 italic font-[family-name:var(--font-fraunces)] mb-6">
          Last 80 drafts across all testers. Click to expand. Use Copy for tuning to drop a structured block into a prompt scratchpad.
        </p>

        <div className="mb-4 flex flex-wrap gap-1 text-xs">
          {(["all", "rejected", "skipped", "approved", "sent"] as FilterMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilter(m)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === m
                  ? "bg-[#1B3B5F] text-white"
                  : "bg-white border border-[#D9CFB5] text-[#14182A]/65 hover:bg-[#EAE3D2]"
              }`}
            >
              {m} ({m === "all" ? items.length : items.filter((it) => {
                if (m === "rejected") return it.critic?.verdict === "reject" || it.status === "rejected_unresolvable";
                if (m === "skipped") return it.status === "skipped";
                if (m === "approved") return it.status === "approved" || it.status === "sent";
                if (m === "sent") return it.status === "sent";
                return true;
              }).length})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((item) => {
            const isOpen = expanded.has(item.id);
            const score = item.critic?.overallScore;
            return (
              <div key={item.id} className="rounded-xl bg-white border border-[#D9CFB5] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[#EAE3D2]/40 transition-colors"
                >
                  <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full ${statusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full ${scoreColor(score ?? null)}`}>
                    {score != null ? `score ${score}` : "no review"}
                  </span>
                  <span className="text-xs font-medium text-[#14182A] truncate flex-1 min-w-[120px]">
                    {item.banker?.name ?? "(no banker)"} {item.firm ? `· ${item.firm}` : ""}
                  </span>
                  <span className="text-[10px] text-[#14182A]/50">{item.type}</span>
                  {item.iterationCount > 0 && (
                    <span className="text-[10px] text-[#C86B4F]">iter {item.iterationCount}</span>
                  )}
                  <span className="text-[10px] text-[#14182A]/45 truncate max-w-[140px]">{item.userEmail}</span>
                  <span className="text-[10px] text-[#14182A]/40">{new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="text-[10px] text-[#14182A]/45">{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-[#D9CFB5]/60 space-y-3">
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#14182A]/45 mb-1">Subject</p>
                        <p className="text-sm font-medium">{item.subject ?? "(none)"}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[#14182A]/45 mt-3 mb-1">Body</p>
                        <pre className="text-xs whitespace-pre-wrap font-[family-name:var(--font-geist-mono)] text-[#14182A]/85 bg-[#EAE3D2]/50 rounded-lg p-3 max-h-72 overflow-y-auto">{item.body}</pre>
                        {item.preEditAiBody && item.preEditAiBody !== item.body && (
                          <>
                            <p className="text-[10px] uppercase tracking-wider text-[#14182A]/45 mt-3 mb-1">Pre-edit AI body (user changed it)</p>
                            <pre className="text-xs whitespace-pre-wrap font-[family-name:var(--font-geist-mono)] text-[#14182A]/65 bg-[#EAE3D2]/40 rounded-lg p-3 max-h-56 overflow-y-auto">{item.preEditAiBody}</pre>
                          </>
                        )}
                        {item.editPct != null && item.editPct > 5 && (
                          <p className="text-[10px] text-[#C86B4F] mt-1">~{item.editPct}% length delta from AI to final</p>
                        )}
                      </div>
                      <div>
                        {item.critic ? (
                          <>
                            <p className="text-[10px] uppercase tracking-wider text-[#14182A]/45 mb-1">Critic verdict</p>
                            <p className="text-sm font-medium text-[#14182A]/85">
                              {item.critic.verdict} · score {item.critic.overallScore ?? "—"}
                            </p>
                            {item.critic.scores && (
                              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                                {(["guardrails","voiceMatch","specificity","sharedGround"] as const).map((axis) => (
                                  <div key={axis} className="flex items-center justify-between bg-[#EAE3D2]/40 rounded px-2 py-1">
                                    <span className="text-[#14182A]/60">{axis}</span>
                                    <span className="font-mono">{item.critic?.scores?.[axis] ?? "—"}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] uppercase tracking-wider text-[#14182A]/45 mt-3 mb-1">Feedback</p>
                            <p className="text-xs text-[#14182A]/85 whitespace-pre-wrap leading-relaxed">{item.critic.feedback ?? "(none)"}</p>
                          </>
                        ) : (
                          <p className="text-xs text-[#14182A]/45">No critic review.</p>
                        )}
                        {item.skipReason && (
                          <>
                            <p className="text-[10px] uppercase tracking-wider text-[#C86B4F] mt-3 mb-1">User skip reason</p>
                            <p className="text-xs text-[#14182A]/85 italic">{item.skipReason}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => copyForTuning(item)}
                        className="rounded-lg bg-[#1B3B5F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2E5A88] transition-colors"
                      >
                        {copiedId === item.id ? "Copied ✓" : "Copy for prompt tuning"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-[#14182A]/45 py-8 italic">No drafts match this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}
