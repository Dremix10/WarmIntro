"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    // Supabase recovery flow lands here with the session in the URL hash:
    //   #access_token=…&refresh_token=…&type=recovery&expires_at=…
    // Our @supabase/ssr browser client defaults to the PKCE flow which
    // looks for ?code= in the query string, so it doesn't auto-detect
    // the hash-based recovery payload. Parse it manually and seed the
    // session.
    let cancelled = false;

    async function init() {
      try {
        // Already-authed (e.g. user already on this tab from a prior reset)
        const initial = await supabase.auth.getSession();
        if (cancelled) return;
        if (initial.data.session) { setReady(true); return; }

        // Parse the recovery hash. window.location.hash starts with "#".
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        if (hash) {
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const errorDesc = params.get("error_description") ?? params.get("error");
          if (errorDesc) {
            setReady(false);
            setErrMsg(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
            return;
          }
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (cancelled) return;
            if (error) {
              setReady(false);
              setErrMsg(error.message);
            } else {
              // Strip the hash so a refresh doesn't try to re-process a stale token
              window.history.replaceState(null, "", window.location.pathname);
              setReady(true);
            }
            return;
          }
        }
        // No hash + no session → link is missing or expired
        setReady(false);
      } finally {
        if (!cancelled) setInitDone(true);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!cancelled) setReady(Boolean(s));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setErrMsg("Password must be 6+ characters."); return; }
    if (password !== confirm) { setErrMsg("Passwords don't match."); return; }
    setErrMsg(null);
    setState("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setState("saved");
      setTimeout(() => router.push("/today"), 1500);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something broke.");
      setState("err");
    }
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Reset password</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl">Pick a new one</h1>
        </div>

        {!ready && !initDone ? (
          <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5] text-center text-sm text-[#14182A]/70">
            Loading your reset link...
          </div>
        ) : !ready && initDone ? (
          <div className="rounded-2xl bg-white p-6 border border-[#C86B4F]/30 text-center text-sm">
            <p className="text-[#C86B4F] font-medium">Reset link is missing or expired.</p>
            {errMsg && <p className="text-xs text-[#14182A]/60 mt-2">{errMsg}</p>}
            <p className="text-xs text-[#14182A]/60 mt-3">
              <a href="/forgot-password" className="underline text-[#2E5A88]">Request a fresh link →</a>
            </p>
          </div>
        ) : state === "saved" ? (
          <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-xl">Updated.</p>
            <p className="text-sm text-[#14182A]/60 mt-1 italic">Taking you to /today...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 border border-[#D9CFB5] space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (6+ chars)" required minLength={6}
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password" required minLength={6}
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none" />
            {errMsg && <p className="text-sm text-[#C86B4F]">{errMsg}</p>}
            <button type="submit" disabled={state === "saving"}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors">
              {state === "saving" ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
