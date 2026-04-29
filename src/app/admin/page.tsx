"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

interface AdminUser {
  id: string;
  authEmail: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  profile: {
    name: string;
    university: string;
    major: string;
    graduationYear: number;
    targetFirmCount: number;
    targetGroups: string[];
    hasResume: boolean;
    resumeChars: number;
    storyOneLiner: string | null;
    gmailEmail: string | null;
    gmailConnected: boolean;
    updatedAt: string;
  } | null;
  drafts: { pending: number; sent: number };
  connections: number;
}

export default function AdminPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetState, setResetState] = useState<Record<string, { busy?: boolean; link?: string; sent?: boolean; error?: string }>>({});

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (res.status === 403) {
      setError("Not an admin email. Add yours to ADMIN_EMAILS env.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(`Load failed: HTTP ${res.status}`);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  async function resetPassword(userId: string) {
    setResetState((s) => ({ ...s, [userId]: { busy: true } }));
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResetState((s) => ({ ...s, [userId]: { error: json.error ?? `HTTP ${res.status}` } }));
      return;
    }
    setResetState((s) => ({ ...s, [userId]: { link: json.actionLink, sent: json.emailSent } }));
  }

  if (authLoading || loading) return <SkeletonPage />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
        <div className="rounded-2xl bg-white p-8 border border-[#D9CFB5] max-w-md text-center">
          <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Admin only</p>
          <p className="text-sm text-[#14182A]/70">{error}</p>
        </div>
      </div>
    );
  }

  // Quick rollup stats
  const stats = {
    total: users.length,
    completedSetup: users.filter((u) => u.profile && u.profile.targetFirmCount > 0).length,
    gmailConnected: users.filter((u) => u.profile?.gmailConnected).length,
    hasSent: users.filter((u) => u.drafts.sent > 0).length,
    hasReplies: users.filter((u) => u.connections > u.drafts.sent).length,
  };

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-1">Admin</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Users</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-8">
          Every Alma user. Where they are in the funnel. Reset their password if they&apos;re stuck.
        </p>

        <div className="mb-6 rounded-2xl bg-white p-5 border border-[#D9CFB5] grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Stat label="Total users" value={stats.total} />
          <Stat label="Setup complete" value={stats.completedSetup} />
          <Stat label="Gmail connected" value={stats.gmailConnected} />
          <Stat label="Sent ≥ 1 email" value={stats.hasSent} />
          <Stat label="Have a thread" value={stats.hasReplies} />
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <UserRow key={u.id} user={u} resetState={resetState[u.id]} onReset={() => resetPassword(u.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-fraunces)] text-3xl tabular-nums text-[#14182A]">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50 mt-0.5">{label}</p>
    </div>
  );
}

function UserRow({ user, resetState, onReset }: {
  user: AdminUser;
  resetState: { busy?: boolean; link?: string; sent?: boolean; error?: string } | undefined;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const setupComplete = Boolean(user.profile && user.profile.targetFirmCount > 0);
  return (
    <div className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-[#EAE3D2]/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{user.profile?.name ?? user.authEmail}</p>
            <p className="text-xs text-[#14182A]/60">{user.authEmail}{user.profile?.university ? ` · ${user.profile.university}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              <Badge ok={setupComplete} label={setupComplete ? "Setup ✓" : "No setup"} />
              <Badge ok={user.profile?.hasResume ?? false} label={user.profile?.hasResume ? `Resume (${user.profile.resumeChars} chars)` : "No resume"} />
              <Badge ok={user.profile?.gmailConnected ?? false} label={user.profile?.gmailConnected ? `Gmail ${user.profile.gmailEmail ?? ""}` : "No Gmail"} />
              <Badge ok={user.drafts.sent > 0} label={`${user.drafts.sent} sent · ${user.drafts.pending} queued`} />
              <Badge ok={user.connections > 0} label={`${user.connections} connections`} />
            </div>
          </div>
          <div className="text-right text-[10px] text-[#14182A]/50 shrink-0">
            <p>Last seen</p>
            <p>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}</p>
          </div>
        </div>
      </button>

      {expanded && user.profile && (
        <div className="border-t border-[#D9CFB5] p-4 text-xs space-y-2">
          <p><span className="text-[#14182A]/50">Major / grad:</span> {user.profile.major} · &lsquo;{String(user.profile.graduationYear).slice(2)}</p>
          <p><span className="text-[#14182A]/50">Target firms:</span> {user.profile.targetFirmCount} picked</p>
          <p><span className="text-[#14182A]/50">Target groups:</span> {user.profile.targetGroups.join(", ") || "none"}</p>
          {user.profile.storyOneLiner && (
            <p><span className="text-[#14182A]/50">Why IB:</span> {user.profile.storyOneLiner}</p>
          )}
          {user.profile.hasResume && (
            <p>
              <span className="text-[#14182A]/50">Resume:</span>{" "}
              <button
                type="button"
                onClick={async () => {
                  const { data: { session: s } } = await supabase.auth.getSession();
                  const res = await fetch(`/api/admin/users/${user.id}/resume`, {
                    headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
                  });
                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    alert(`Couldn't fetch resume: ${(json as { error?: string }).error ?? res.statusText}`);
                    return;
                  }
                  // Trigger download via blob URL — the route already sets
                  // Content-Disposition so the filename is clean.
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  // Don't override the server-supplied filename.
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="text-[#2E5A88] hover:underline"
              >
                Download .txt ({user.profile.resumeChars.toLocaleString()} chars)
              </button>
            </p>
          )}

          <div className="pt-3 border-t border-[#EAE3D2] flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={resetState?.busy}
              className="rounded-lg bg-[#1B3B5F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2E5A88] transition-colors disabled:opacity-50"
            >
              {resetState?.busy ? "Generating…" : "Reset password"}
            </button>
            {resetState?.link && (
              <span className="text-[10px] text-[#14182A]/60">
                {resetState.sent ? "Email sent + " : "Email failed — "}
                <button type="button" onClick={() => navigator.clipboard.writeText(resetState.link!)} className="underline text-[#2E5A88]">copy link</button>
              </span>
            )}
            {resetState?.error && (
              <span className="text-[10px] text-[#C86B4F]">{resetState.error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full ${ok ? "bg-[#2E5A88]/15 text-[#2E5A88]" : "bg-[#C86B4F]/15 text-[#C86B4F]"}`}>
      {label}
    </span>
  );
}
