"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";
import { isSyntheticEmail } from "@/lib/synthetic-email";

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
  cost24hUsd: number;
}

interface AccessRequest {
  id: string;
  email: string;
  name: string | null;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  hasResume: boolean;
  createdAt: string;
  approved: boolean;
}

export default function AdminPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetState, setResetState] = useState<Record<string, { busy?: boolean; link?: string; sent?: boolean; error?: string }>>({});
  const [approveState, setApproveState] = useState<Record<string, { busy?: boolean; link?: string; error?: string }>>({});
  const [rejectState, setRejectState] = useState<Record<string, { busy?: boolean; error?: string }>>({});
  const [cleanupState, setCleanupState] = useState<{ busy?: boolean; deleted?: number; error?: string }>({});
  const [welcomeState, setWelcomeState] = useState<Record<string, { busy?: boolean; sent?: boolean; emailId?: string; error?: string }>>({});

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers = { Authorization: `Bearer ${s?.access_token ?? ""}` };
    // Two reads in parallel — saves the round-trip.
    const [usersRes, requestsRes] = await Promise.all([
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/access-requests", { headers }),
    ]);
    if (usersRes.status === 403) {
      setError("Not an admin email. Add yours to ADMIN_EMAILS env.");
      setLoading(false);
      return;
    }
    if (!usersRes.ok) {
      setError(`Load failed: HTTP ${usersRes.status}`);
      setLoading(false);
      return;
    }
    const usersJson = await usersRes.json();
    setUsers(usersJson.users ?? []);
    if (requestsRes.ok) {
      const reqJson = await requestsRes.json();
      setRequests(reqJson.requests ?? []);
    }
    setLoading(false);
  }

  async function approveRequest(requestId: string) {
    setApproveState((s) => ({ ...s, [requestId]: { busy: true } }));
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/access-requests/${requestId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setApproveState((s) => ({ ...s, [requestId]: { error: json.error ?? `HTTP ${res.status}` } }));
      return;
    }
    setApproveState((s) => ({ ...s, [requestId]: { link: json.setupLink } }));
    // Mark this request as approved locally so the UI flips immediately
    setRequests((rs) => rs.map((r) => (r.id === requestId ? { ...r, approved: true } : r)));
  }

  async function rejectRequest(requestId: string) {
    setRejectState((s) => ({ ...s, [requestId]: { busy: true } }));
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/access-requests/${requestId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRejectState((s) => ({ ...s, [requestId]: { error: json.error ?? `HTTP ${res.status}` } }));
      return;
    }
    // Drop the row from local state so it disappears from the list immediately.
    setRequests((rs) => rs.filter((r) => r.id !== requestId));
  }

  async function cleanupE2eRequests() {
    if (!window.confirm("Delete all synthetic test signups (e2e-*, smoke-*, *@example.com)? This is irreversible.")) return;
    setCleanupState({ busy: true });
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/access-requests/cleanup-e2e", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCleanupState({ error: json.error ?? `HTTP ${res.status}` });
      return;
    }
    setCleanupState({ deleted: json.deleted ?? 0 });
    // Drop the matching rows locally so the count updates without a reload.
    setRequests((rs) => rs.filter((r) => !isSyntheticEmail(r.email)));
  }

  async function sendWelcome(userId: string) {
    if (!window.confirm("Send the welcome email to this user? Mints a fresh setup link (1h TTL).")) return;
    setWelcomeState((s) => ({ ...s, [userId]: { busy: true } }));
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users/${userId}/send-welcome`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWelcomeState((s) => ({ ...s, [userId]: { error: json.error ?? `HTTP ${res.status}` } }));
      return;
    }
    setWelcomeState((s) => ({ ...s, [userId]: { sent: true, emailId: json.emailId } }));
    window.setTimeout(() => setWelcomeState((s) => ({ ...s, [userId]: { ...(s[userId] ?? {}), sent: false } })), 8000);
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
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Alma control room</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-3">
          Approve waitlist. Reset passwords. See who&rsquo;s stuck.
        </p>
        <div className="mb-8 flex flex-wrap gap-2 text-xs">
          <a href="/admin/drafts" className="rounded-full bg-white border border-[#D9CFB5] px-3 py-1.5 font-medium text-[#1B3B5F] hover:bg-[#EAE3D2] transition-colors">
            Recent drafts ↗ <span className="text-[#14182A]/50">prompt tuning</span>
          </a>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 border border-[#D9CFB5] grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Stat label="Total users" value={stats.total} />
          <Stat label="Setup complete" value={stats.completedSetup} />
          <Stat label="Gmail connected" value={stats.gmailConnected} />
          <Stat label="Sent ≥ 1 email" value={stats.hasSent} />
          <Stat label="Have a thread" value={stats.hasReplies} />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 border border-[#D9CFB5] flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#14182A]/55 font-semibold mb-0.5">Admin tools</p>
            <p className="text-xs text-[#14182A]/70">
              Preview the welcome email by sending a sample to your own admin address.
            </p>
          </div>
          <TestWelcomeButton />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 border border-[#D9CFB5]">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#14182A]/55 font-semibold mb-0.5">Architect</p>
              <p className="text-xs text-[#14182A]/70">
                Run the meta-prompting agent now. Reads the last 24h of failed drafts and proposes positive prompt fixes diagnosed at the right layer (prompt / upstream_data / iteration_regression).
              </p>
            </div>
            <ArchitectRunButton />
          </div>
        </div>

        {/* Waitlist queue — pilot_signups rows pending admin approval.
            Shows up only if there's something to act on. */}
        {requests.filter((r) => !r.approved).length > 0 && (
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">Waitlist</h2>
              <div className="flex items-center gap-3">
                {(() => {
                  const syntheticCount = requests.filter((r) => !r.approved && isSyntheticEmail(r.email)).length;
                  if (syntheticCount === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={cleanupE2eRequests}
                      disabled={cleanupState.busy}
                      className="rounded-lg bg-[#C86B4F]/10 text-[#C86B4F] border border-[#C86B4F]/30 px-3 py-1.5 text-xs font-medium hover:bg-[#C86B4F] hover:text-white transition-colors disabled:opacity-50"
                      title="Bulk-delete CI test signups (e2e-*, smoke-*, *@example.com). Real waitlist entries are unaffected."
                    >
                      {cleanupState.busy
                        ? "Cleaning…"
                        : cleanupState.deleted !== undefined
                          ? `Cleaned ${cleanupState.deleted} ✓`
                          : `Clean ${syntheticCount} test signup${syntheticCount === 1 ? "" : "s"}`}
                    </button>
                  );
                })()}
                <p className="text-xs text-[#14182A]/55">{requests.filter((r) => !r.approved).length} pending</p>
              </div>
            </div>
            {cleanupState.error && (
              <p className="text-[10px] text-[#C86B4F] mb-2">{cleanupState.error}</p>
            )}
            <div className="space-y-2">
              {requests
                .filter((r) => !r.approved)
                .map((r) => {
                  const aState = approveState[r.id];
                  const rState = rejectState[r.id];
                  return (
                    <WaitlistRow
                      key={r.id}
                      r={r}
                      state={aState}
                      rejectState={rState}
                      onApprove={() => approveRequest(r.id)}
                      onReject={() => rejectRequest(r.id)}
                    />
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">Users</h2>
          <p className="text-xs text-[#14182A]/55">{users.length}</p>
        </div>
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              resetState={resetState[u.id]}
              welcomeState={welcomeState[u.id]}
              onReset={() => resetPassword(u.id)}
              onSendWelcome={() => sendWelcome(u.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WaitlistRow({
  r,
  state,
  rejectState,
  onApprove,
  onReject,
}: {
  r: AccessRequest;
  state: { busy?: boolean; link?: string; error?: string } | undefined;
  rejectState: { busy?: boolean; error?: string } | undefined;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // Google's OAuth testing-mode tester list — every approved user also needs
  // to land here while Gmail OAuth is unverified. Direct link saves a tab.
  const GOOGLE_AUDIENCE_URL = "https://console.cloud.google.com/auth/audience?project=warmintro";

  async function copyEmail() {
    await navigator.clipboard.writeText(r.email);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="rounded-xl bg-white p-4 border border-[#D9CFB5]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{r.name ?? "(no name)"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <code
              onClick={copyEmail}
              title="Click to copy"
              className={`text-xs cursor-pointer rounded px-1.5 py-0.5 transition-colors ${
                copied ? "bg-[#2E5A88] text-white" : "bg-[#EAE3D2] text-[#14182A]/70 hover:bg-[#D9CFB5]"
              }`}
            >
              {copied ? "copied ✓" : r.email}
            </code>
            <a
              href={GOOGLE_AUDIENCE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#2E5A88] hover:text-[#1B3B5F] underline-offset-2 hover:underline"
              title="Add this user to Google's OAuth testers list"
            >
              Add to Google testers ↗
            </a>
          </div>
          <p className="text-[10px] text-[#14182A]/45 mt-1">
            {r.university ?? "—"}
            {r.major ? ` · ${r.major}` : ""}
            {r.graduationYear ? ` · ${r.graduationYear}` : ""}
            {r.hasResume ? " · resume ✓" : ""}
            {" · "}
            {new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            {!state?.link ? (
              <button
                type="button"
                onClick={onApprove}
                disabled={state?.busy || rejectState?.busy}
                className="rounded-lg bg-[#1B3B5F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2E5A88] transition-colors disabled:opacity-50"
              >
                {state?.busy ? "Approving…" : "Approve"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(state.link!)}
                className="rounded-lg bg-[#2E5A88] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#1B3B5F] transition-colors"
                title="Copy setup link to clipboard"
              >
                copy link ✓
              </button>
            )}
            {!state?.link && (
              <button
                type="button"
                onClick={onReject}
                disabled={state?.busy || rejectState?.busy}
                className="rounded-lg border border-[#D9CFB5] text-[#14182A]/60 px-3 py-1.5 text-xs font-medium hover:bg-[#EAE3D2] hover:text-[#C86B4F] transition-colors disabled:opacity-50"
                title="Permanently delete this waitlist row"
              >
                {rejectState?.busy ? "…" : "Reject"}
              </button>
            )}
          </div>
          {state?.link && (
            <span className="text-[10px] text-[#14182A]/55">link sent to Telegram</span>
          )}
          {state?.error && (
            <span className="text-[10px] text-[#C86B4F]">{state.error}</span>
          )}
          {rejectState?.error && (
            <span className="text-[10px] text-[#C86B4F]">{rejectState.error}</span>
          )}
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

function UserRow({ user, resetState, welcomeState, onReset, onSendWelcome }: {
  user: AdminUser;
  resetState: { busy?: boolean; link?: string; sent?: boolean; error?: string } | undefined;
  welcomeState: { busy?: boolean; sent?: boolean; emailId?: string; error?: string } | undefined;
  onReset: () => void;
  onSendWelcome: () => void;
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
              <Badge ok={user.cost24hUsd < 5} label={`$${user.cost24hUsd.toFixed(2)} / 24h`} />
            </div>
          </div>
          <div className="text-right text-[10px] text-[#14182A]/50 shrink-0">
            <p>Last seen</p>
            <p>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#D9CFB5] p-4 text-xs space-y-2">
          {user.profile ? (
            <>
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
            </>
          ) : (
            // No profiles row yet — typical for users we just approved who
            // haven't clicked through the welcome link. Action buttons below
            // still need to render so the admin can re-issue the welcome.
            <p className="text-[#14182A]/55">User hasn&rsquo;t finished onboarding yet — no profile row. Use the buttons below to (re)issue a setup link.</p>
          )}

          <div className="pt-3 border-t border-[#EAE3D2] flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={resetState?.busy}
              className="rounded-lg bg-[#1B3B5F] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#2E5A88] transition-colors disabled:opacity-50"
            >
              {resetState?.busy ? "Generating…" : "Reset password"}
            </button>
            <button
              type="button"
              onClick={onSendWelcome}
              disabled={welcomeState?.busy}
              className="rounded-lg border border-[#1B3B5F] text-[#1B3B5F] px-3 py-1.5 text-xs font-medium hover:bg-[#1B3B5F] hover:text-white transition-colors disabled:opacity-50"
              title="Mints a fresh setup token (1h) and emails the welcome body. Use for users who never got the welcome (e.g. created outside the approve flow)."
            >
              {welcomeState?.busy ? "Sending…" : "Send welcome"}
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
            {welcomeState?.sent && (
              <span className="text-[10px] text-emerald-700">Welcome sent ✓ {welcomeState.emailId ? `(${welcomeState.emailId.slice(0, 8)})` : ""}</span>
            )}
            {welcomeState?.error && (
              <span className="text-[10px] text-[#C86B4F]">{welcomeState.error}</span>
            )}
          </div>

          <EventsPanel userId={user.id} />
        </div>
      )}
    </div>
  );
}

interface AdminEvent {
  event: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function EventsPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (events !== null) return; // already loaded
    setLoading(true);
    setErr(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users/${userId}/events`, {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json.error ?? `HTTP ${res.status}`);
      setLoading(false);
      return;
    }
    setEvents(json.events ?? []);
    setLoading(false);
  }

  return (
    <div className="pt-3 border-t border-[#EAE3D2]">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        className="text-[10px] uppercase tracking-wider text-[#14182A]/55 font-semibold hover:text-[#2E5A88]"
      >
        {open ? "▾" : "▸"} Recent events {events ? `(${events.length})` : ""}
      </button>
      {open && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-[#EAE3D2]/40 border border-[#D9CFB5] p-2">
          {loading && <p className="text-[10px] text-[#14182A]/50 italic">Loading…</p>}
          {err && <p className="text-[10px] text-[#C86B4F]">{err}</p>}
          {events && events.length === 0 && (
            <p className="text-[10px] text-[#14182A]/50 italic">No events yet — tracking is on, they just haven&apos;t done anything.</p>
          )}
          {events && events.length > 0 && (
            <ul className="space-y-0.5 font-mono text-[10px]">
              {events.map((e, i) => {
                const path = (e.metadata?.path as string | undefined) ?? "";
                const isError = e.event === "js_error" || e.event === "promise_rejection" || e.event === "error";
                return (
                  <li key={i} className={`flex items-baseline gap-2 ${isError ? "text-[#C86B4F]" : "text-[#14182A]/75"}`}>
                    <span className="text-[#14182A]/40 shrink-0 w-20">
                      {new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="font-semibold shrink-0">{e.event}</span>
                    {path && <span className="text-[#14182A]/55 truncate">{path}</span>}
                    {isError && (e.metadata?.message as string) && (
                      <span className="text-[#C86B4F] truncate">— {String(e.metadata.message).slice(0, 100)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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

function TestWelcomeButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [override, setOverride] = useState("");
  const [fromAlias, setFromAlias] = useState("");

  async function send() {
    setState("sending");
    setMsg(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const reqBody: { to?: string; fromAlias?: string } = {};
    if (override.trim().includes("@")) reqBody.to = override.trim();
    if (fromAlias.trim()) reqBody.fromAlias = fromAlias.trim();
    const res = await fetch("/api/admin/test-welcome", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json.error ?? `HTTP ${res.status}`);
      setState("error");
      return;
    }
    const idShort = json.emailId ? String(json.emailId).slice(0, 8) : "no-id";
    const status = json.lastEvent ?? json.deliveryStatus ?? "unknown";
    const fromShort = json.sentFrom ? String(json.sentFrom).match(/<([^>]+)>/)?.[1] ?? "noreply@alma.careers" : "noreply@alma.careers";
    setMsg(`${fromShort} → ${json.sentTo} · resend:${idShort} · status:${status}`);
    setState("sent");
    window.setTimeout(() => setState("idle"), 12000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] text-[#5C6472]">from:</span>
      <div className="flex items-center rounded-lg border border-[#D9CFB5] bg-white">
        <input
          type="text"
          value={fromAlias}
          onChange={(e) => setFromAlias(e.target.value)}
          placeholder="noreply"
          className="px-2 py-1.5 text-xs bg-transparent outline-none w-[100px]"
        />
        <span className="pr-2 text-[10px] text-[#8A8674]">@alma.careers</span>
      </div>
      <input
        type="email"
        value={override}
        onChange={(e) => setOverride(e.target.value)}
        placeholder="to override (e.g. dremixc10@gmail.com)"
        className="rounded-lg border border-[#D9CFB5] px-2 py-1.5 text-xs bg-white min-w-[240px]"
      />
      <button
        type="button"
        onClick={send}
        disabled={state === "sending"}
        className="shrink-0 rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-xs font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
      >
        {state === "sending" ? "Sending…" : "Send test email →"}
      </button>
      {msg && (
        <span className={`text-[10px] ${state === "error" ? "text-[#C86B4F]" : "text-[#14182A]/60"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}

interface ArchitectPattern {
  name: string;
  layer: string;
  frequencyEstimate: string;
  whyItHappens: string;
  positiveFix: string;
  exampleBefore?: string;
  exampleAfter?: string;
}
interface ArchitectReportShape {
  recurringPatterns: ArchitectPattern[];
  oneSentenceTakeaway: string;
}

function ArchitectRunButton() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [report, setReport] = useState<ArchitectReportShape | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftsReviewed, setDraftsReviewed] = useState<number | null>(null);

  async function run() {
    setState("running");
    setErrorMsg(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/architect/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lookbackHours: 24 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg(json.error ?? `HTTP ${res.status}`);
      setState("error");
      return;
    }
    setReport((json.report as ArchitectReportShape | null) ?? null);
    setDraftsReviewed(json.summary?.draftsReviewed ?? null);
    setState("done");
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[140px]">
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="shrink-0 rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-xs font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
      >
        {state === "running" ? "Running…" : "Run Architect ($0.05)"}
      </button>
      {errorMsg && <span className="text-[10px] text-[#C86B4F]">{errorMsg}</span>}
      {state === "done" && draftsReviewed !== null && (
        <span className="text-[10px] text-[#14182A]/60">
          reviewed {draftsReviewed} drafts · {report?.recurringPatterns?.length ?? 0} patterns
        </span>
      )}
      {report && (
        <div className="w-full max-w-3xl mt-2 rounded-xl bg-[#EAE3D2]/40 p-4 border border-[#D9CFB5] text-left">
          <p className="text-xs italic font-[family-name:var(--font-fraunces)] text-[#1B3B5F] mb-3">
            {report.oneSentenceTakeaway}
          </p>
          <div className="space-y-3">
            {report.recurringPatterns.map((p, i) => (
              <div key={i} className="rounded-lg bg-white p-3 border border-[#D9CFB5]">
                <p className="text-sm font-semibold text-[#14182A]">
                  {p.name}{" "}
                  <span className="text-[10px] uppercase tracking-wider text-[#C86B4F] ml-1">{p.layer}</span>{" "}
                  <span className="text-[10px] text-[#14182A]/55 ml-1">{p.frequencyEstimate}</span>
                </p>
                <p className="text-xs text-[#14182A]/75 mt-1.5"><strong>Why:</strong> {p.whyItHappens}</p>
                <p className="text-xs text-[#14182A]/75 mt-1.5"><strong>Fix:</strong> {p.positiveFix}</p>
                {p.exampleAfter && (
                  <p className="text-[11px] text-[#14182A]/60 italic mt-1.5">
                    <strong className="not-italic">After:</strong> &ldquo;{p.exampleAfter}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
