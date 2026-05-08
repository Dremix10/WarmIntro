"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";
import { groupLabels } from "@/lib/labels";

interface ProfileSnapshot {
  name: string;
  email: string;
  university: string;
  major: string;
  graduation_year: number;
  target_firms: string[];
  target_groups: string[];
  gmail_connected_at: string | null;
  gmail_email: string | null;
  story_one_liner: string | null;
}

interface FirmRef {
  id: string;
  name: string;
}

export default function AccountPage() {
  const { session, authLoading, signOut } = useAppState();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [firmsById, setFirmsById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwState, setPwState] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [disconnectState, setDisconnectState] = useState<"idle" | "working">("idle");
  const [gmailState, setGmailState] = useState<"idle" | "opening" | "err">("idle");
  const [gmailErr, setGmailErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("name, email, university, major, graduation_year, target_firms, target_groups, gmail_connected_at, gmail_email, story_one_liner")
      .eq("id", session.user.id)
      .maybeSingle();
    const snapshot = (data as unknown as ProfileSnapshot) ?? null;

    // No profile or no targets picked — bounce to setup. Mirrors /today's logic
    // so users can't land on a blank /account page after signup.
    if (!snapshot || !snapshot.target_firms?.length) {
      router.replace("/setup");
      return;
    }

    setProfile(snapshot);

    // Load firm name map so we can render "Morgan Stanley, Goldman Sachs"
    // instead of "5 picked". Cheap public endpoint, cached by browser.
    try {
      const res = await fetch("/api/setup/firms");
      if (res.ok) {
        const json = (await res.json()) as { firms: FirmRef[] };
        const map: Record<string, string> = {};
        for (const f of json.firms ?? []) map[f.id] = f.name;
        setFirmsById(map);
      }
    } catch {
      // Non-fatal — falls back to "N picked"
    }

    setLoading(false);
  }, [router, session]);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) void load();
    // Use user.id — token refresh shouldn't refetch.
  }, [authLoading, load, router, session]);

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pwNew.length < 6) { setPwErr("6+ characters."); return; }
    if (pwNew !== pwConfirm) { setPwErr("Passwords don't match."); return; }
    setPwErr(null);
    setPwState("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) throw error;
      setPwState("saved");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => setPwState("idle"), 2500);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Failed.");
      setPwState("err");
    }
  }

  async function disconnectGmail() {
    if (!session) return;
    if (!confirm("Disconnect Gmail? Alma will stop sending and stop watching for replies.")) return;
    setDisconnectState("working");
    await supabase
      .from("profiles")
      .update({
        gmail_refresh_token_encrypted: null,
        gmail_access_token_encrypted: null,
        gmail_token_expires_at: null,
        gmail_connected_at: null,
        gmail_email: null,
        gmail_scopes: null,
      })
      .eq("id", session.user.id);
    await load();
    setDisconnectState("idle");
  }

  async function startGmailConnect() {
    if (!session) return;
    setGmailState("opening");
    setGmailErr(null);
    try {
      const res = await fetch("/api/auth/gmail/start", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json.error as string | undefined) ?? `HTTP ${res.status}`);
      }
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("No Gmail auth URL returned.");
      const popup = window.open(url, "alma-gmail-oauth");
      if (!popup) {
        window.location.href = url;
        return;
      }
      const pollId = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(pollId);
          setGmailState("idle");
          void load();
        }
      }, 600);
    } catch (err) {
      setGmailErr(err instanceof Error ? err.message : "Could not start Gmail connection.");
      setGmailState("err");
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; status?: string; error?: string | null } | null;
      if (data?.type !== "alma-gmail-oauth") return;
      if (data.status === "connected") {
        setGmailState("idle");
        void load();
      } else {
        setGmailState("err");
        setGmailErr(data?.error ?? "Gmail connection failed.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (authLoading || loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Account</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-8">Your settings</h1>

        {/* Profile snapshot */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-3">Profile</h2>
          <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5] space-y-2 text-sm">
            <Row label="Name" value={profile?.name ?? "—"} />
            <Row label="Email" value={profile?.email ?? session?.user.email ?? "—"} />
            <Row label="School" value={profile?.university ?? "—"} />
            <Row label="Major · Grad" value={`${profile?.major ?? "—"} · '${String(profile?.graduation_year ?? "").slice(2)}`} />
            <Row
              label="Target firms"
              value={
                profile?.target_firms?.length
                  ? profile.target_firms.map((id) => firmsById[id] ?? id).join(", ")
                  : "none yet"
              }
            />
            <Row
              label="Target groups"
              value={profile?.target_groups?.length ? groupLabels(profile.target_groups).join(", ") : "none yet"}
            />
            <Row label="Why IB" value={profile?.story_one_liner ?? "—"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/setup?edit=targets"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2E5A88] text-white px-4 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
            >
              Edit firms + groups
            </a>
            <a
              href="/setup?edit=resume"
              className="inline-flex items-center gap-2 rounded-lg border border-[#2E5A88] text-[#2E5A88] px-4 py-2 text-sm font-medium hover:bg-[#2E5A88]/10 transition-colors"
            >
              Re-upload resume
            </a>
          </div>
          <p className="mt-2 text-xs text-[#14182A]/50 italic">
            Picks up where you are — change banks, groups, or your &ldquo;why IB&rdquo; sentence and re-run.
          </p>
        </section>

        {/* Gmail */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-3">Gmail connection</h2>
          <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5]">
            {profile?.gmail_connected_at ? (
              <>
                <p className="text-sm">
                  Connected as <strong>{profile.gmail_email ?? "—"}</strong> since{" "}
                  {new Date(profile.gmail_connected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                </p>
                <p className="text-xs text-[#14182A]/60 mt-1 italic">Scopes: gmail.compose + gmail.readonly. See what Alma touched at <a href="/account/privacy" className="underline text-[#2E5A88]">/account/privacy</a>.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={startGmailConnect}
                    disabled={gmailState === "opening"}
                    className="rounded-lg bg-[#2E5A88] text-white px-4 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-50"
                  >
                    {gmailState === "opening" ? "Opening..." : "Reconnect Gmail"}
                  </button>
                  <button
                    type="button"
                    onClick={disconnectGmail}
                    disabled={disconnectState === "working"}
                    className="rounded-lg border border-[#C86B4F] text-[#C86B4F] px-4 py-2 text-sm font-medium hover:bg-[#C86B4F] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {disconnectState === "working" ? "Disconnecting..." : "Disconnect Gmail"}
                  </button>
                </div>
                {gmailErr && <p className="mt-2 text-xs text-[#C86B4F]">{gmailErr}</p>}
              </>
            ) : (
              <>
                <p className="text-sm">Gmail not connected.</p>
                <button
                  type="button"
                  onClick={startGmailConnect}
                  disabled={gmailState === "opening"}
                  className="mt-3 rounded-lg bg-[#2E5A88] text-white px-4 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-50"
                >
                  {gmailState === "opening" ? "Opening..." : "Connect Gmail"}
                </button>
                {gmailErr && <p className="mt-2 text-xs text-[#C86B4F]">{gmailErr}</p>}
              </>
            )}
          </div>
        </section>

        {/* Password */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-3">Change password</h2>
          <form onSubmit={savePassword} className="rounded-2xl bg-white p-5 border border-[#D9CFB5] space-y-3">
            <PasswordField
              value={pwNew}
              onChange={setPwNew}
              placeholder="New password (6+ chars)"
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((v) => !v)}
            />
            <PasswordField
              value={pwConfirm}
              onChange={setPwConfirm}
              placeholder="Confirm new password"
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((v) => !v)}
            />
            {pwErr && <p className="text-sm text-[#C86B4F]">{pwErr}</p>}
            <button type="submit" disabled={pwState === "saving"}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50">
              {pwState === "saving" ? "Saving..." : pwState === "saved" ? "Saved ✓" : "Save new password"}
            </button>
          </form>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-3">Session</h2>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-[#14182A]/20 px-4 py-2 text-sm font-medium text-[#14182A] hover:border-[#C86B4F] hover:text-[#C86B4F] transition-colors"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 text-xs text-[#14182A]/50 uppercase tracking-wider">{label}</span>
      <span className="flex-1 text-[#14182A]/90">{value}</span>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={6}
        className="w-full rounded-xl border border-[#D9CFB5] px-4 py-3 pr-11 text-sm focus:border-[#2E5A88] focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8674] hover:text-[#2E5A88] transition-colors"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}
