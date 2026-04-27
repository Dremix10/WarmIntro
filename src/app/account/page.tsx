"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";

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

export default function AccountPage() {
  const { session, authLoading, signOut } = useAppState();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwState, setPwState] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [disconnectState, setDisconnectState] = useState<"idle" | "working">("idle");

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
    // Use user.id — token refresh shouldn't refetch.
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("name, email, university, major, graduation_year, target_firms, target_groups, gmail_connected_at, gmail_email, story_one_liner")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile((data as unknown as ProfileSnapshot) ?? null);
    setLoading(false);
  }

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

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
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
            <Row label="Target firms" value={profile?.target_firms?.length ? `${profile.target_firms.length} picked` : "none yet"} />
            <Row label="Target groups" value={profile?.target_groups?.length ? profile.target_groups.join(", ") : "none yet"} />
            <Row label="Why IB" value={profile?.story_one_liner ?? "—"} />
          </div>
          <a
            href="/setup"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2E5A88] text-white px-4 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
          >
            Edit profile + targets →
          </a>
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
                <button
                  type="button"
                  onClick={disconnectGmail}
                  disabled={disconnectState === "working"}
                  className="mt-4 rounded-lg border border-[#C86B4F] text-[#C86B4F] px-4 py-2 text-sm font-medium hover:bg-[#C86B4F] hover:text-white transition-colors disabled:opacity-50"
                >
                  {disconnectState === "working" ? "Disconnecting..." : "Disconnect Gmail"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm">Gmail not connected.</p>
                <a href="/setup" className="mt-3 inline-block rounded-lg bg-[#2E5A88] text-white px-4 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors">
                  Connect Gmail
                </a>
              </>
            )}
          </div>
        </section>

        {/* Password */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-3">Change password</h2>
          <form onSubmit={savePassword} className="rounded-2xl bg-white p-5 border border-[#D9CFB5] space-y-3">
            <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
              placeholder="New password (6+ chars)" minLength={6}
              className="w-full rounded-xl border border-[#D9CFB5] px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none" />
            <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="Confirm new password" minLength={6}
              className="w-full rounded-xl border border-[#D9CFB5] px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none" />
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
