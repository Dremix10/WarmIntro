"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicTopBar } from "@/components/PublicTopBar";

// Self-owned recovery flow — no Supabase Auth in the loop. Page reads
// ?token= from the query, posts to /api/auth/set-password with the
// new password, redirects to /login on success.

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const hasToken = token.length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setErrMsg("Password must be 6+ characters."); return; }
    if (password !== confirm) { setErrMsg("Passwords don't match."); return; }
    setErrMsg(null);
    setState("saving");
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
        setState("err");
        return;
      }

      // CRITICAL: Supabase's admin.updateUserById revokes all existing
      // sessions for this user server-side. The browser cookie still
      // contains the now-dead tokens, but supabase-js client-side will
      // happily report `getSession()` truthy until those cookies are
      // explicitly cleared. That divergence — UI thinks signed-in, server
      // refuses every request — is what produces the "Your dashboard →
      // bounces back to landing" loop. Sign out the browser EXPLICITLY
      // here so the redirect to /login lands clean and the user's next
      // signInWithPassword mints a fresh, valid session.
      try {
        const { supabase: sb } = await import("@/lib/supabase-browser");
        await sb.auth.signOut();
      } catch {
        // Best-effort. If signOut fails the /login refreshSession guard
        // (added 3d1f129) catches it as a fallback.
      }

      setState("saved");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something broke.");
      setState("err");
    }
  }

  return (
    <div className="relative min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
      <PublicTopBar />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Reset password</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl">Pick a new one</h1>
        </div>

        {!hasToken ? (
          <div className="rounded-2xl bg-white p-6 border border-[#C86B4F]/30 text-center text-sm">
            <p className="text-[#C86B4F] font-medium">Reset link is missing or malformed.</p>
            <p className="text-xs text-[#14182A]/60 mt-3">
              <a href="/forgot-password" className="underline text-[#2E5A88]">Request a fresh link →</a>
            </p>
          </div>
        ) : state === "saved" ? (
          <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-xl">Updated.</p>
            <p className="text-sm text-[#14182A]/60 mt-1 italic">Taking you to the login page...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 border border-[#D9CFB5] space-y-3">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (6+ chars)"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 pr-11 text-sm focus:border-[#2E5A88] focus:outline-none"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide" : "Show"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8674] hover:text-[#2E5A88]">
                {showPassword ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 pr-11 text-sm focus:border-[#2E5A88] focus:outline-none"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? "Hide" : "Show"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8674] hover:text-[#2E5A88]">
                {showConfirm ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {errMsg && <p className="text-sm text-[#C86B4F]">{errMsg}</p>}
            <button
              type="submit"
              disabled={state === "saving"}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
            >
              {state === "saving" ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#EAE3D2]" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
