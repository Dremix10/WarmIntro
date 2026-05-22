"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonAgents } from "@/components/Skeleton";

interface AgentRunRow {
  id: string;
  agent: "planner" | "researcher" | "correspondent" | "critic" | "watcher" | "curator";
  triggered_by: string | null;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  duration_ms: number | null;
  error: string | null;
  started_at: string;
}

interface FlywheelRow {
  id: string;
  week_of: string;
  headline: string;
  changes: Record<string, unknown>;
  published_at: string;
}

const AGENT_DETAILS: Record<string, { label: string; color: string; role: string }> = {
  planner: { label: "Planner", color: "#14182A", role: "Orchestrator. Reads your state and decides what the others should do." },
  researcher: { label: "Researcher", color: "#2E5A88", role: "Finds the right bankers to contact." },
  correspondent: { label: "Correspondent", color: "#1B3B5F", role: "Writes the emails in your voice." },
  critic: { label: "Critic", color: "#C86B4F", role: "Reviews every draft before send." },
  watcher: { label: "Watcher", color: "#E8B339", role: "Reads your inbox. Advances the pipeline." },
  curator: { label: "Curator", color: "#6B4F3E", role: "Keeps the database fresh, 24/7." },
};

export default function AgentsPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [runs, setRuns] = useState<AgentRunRow[]>([]);
  const [flywheel, setFlywheel] = useState<FlywheelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/agents/runs", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (res.ok) {
      const json = (await res.json()) as { runs: AgentRunRow[]; flywheel: FlywheelRow[] };
      setRuns(json.runs);
      setFlywheel(json.flywheel);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/");
      return;
    }
    if (session) void load();
    // Use user.id — Supabase token refresh on tab focus mints a new session ref.
  }, [authLoading, load, router, session]);

  // Group runs by agent
  const byAgent: Record<string, AgentRunRow[]> = {};
  for (const r of runs) {
    if (!byAgent[r.agent]) byAgent[r.agent] = [];
    byAgent[r.agent].push(r);
  }

  if (authLoading || loading) {
    return <SkeletonAgents />;
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Behind the scenes</p>
          <h1 className="text-4xl font-[family-name:var(--font-fraunces)] font-medium">The agents</h1>
          <p className="mt-2 text-sm text-[#14182A]/70">
            Six agents work on your recruiting. Five serve you in real time. One runs 24/7 on the data itself.
          </p>
        </div>

        {/* Flywheel releases */}
        {flywheel.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-3">What Alma learned</h2>
            <div className="space-y-3">
              {flywheel.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-5 border border-[#D9CFB5]">
                  <p className="text-xs text-[#14182A]/50 mb-1">Week of {r.week_of}</p>
                  <p className="font-[family-name:var(--font-fraunces)] text-lg italic">{r.headline}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Per-agent columns */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.keys(AGENT_DETAILS).map((key) => {
            const details = AGENT_DETAILS[key];
            const agentRuns = byAgent[key] ?? [];
            return (
              <div key={key} className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
                <div
                  className="px-4 py-3"
                  style={{ backgroundColor: `${details.color}15`, borderBottom: `1px solid ${details.color}30` }}
                >
                  <p className="font-[family-name:var(--font-fraunces)] text-lg" style={{ color: details.color }}>
                    {details.label}
                  </p>
                  <p className="text-xs text-[#14182A]/70 mt-0.5">{details.role}</p>
                </div>
                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  {agentRuns.length === 0 ? (
                    <p className="text-xs text-[#14182A]/40 italic">Hasn&apos;t run yet.</p>
                  ) : (
                    agentRuns.slice(0, 8).map((r) => (
                      <div key={r.id} className="text-xs border-l-2 pl-2 py-1" style={{ borderColor: details.color }}>
                        <div className="flex justify-between">
                          <span className="text-[#14182A]/70">{r.triggered_by ?? "—"}</span>
                          <span className="text-[#14182A]/40">
                            {new Date(r.started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        {r.output_summary && (
                          <pre className="mt-1 text-[#14182A]/60 whitespace-pre-wrap text-[10px] font-[family-name:var(--font-geist-mono)]">
                            {formatSummary(r.output_summary)}
                          </pre>
                        )}
                        {r.error && <p className="mt-1 text-[#C86B4F] text-[10px]">{r.error}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatSummary(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
    .slice(0, 6);
  if (entries.length === 0) return "(no output)";
  return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60)}`).join("\n");
}
