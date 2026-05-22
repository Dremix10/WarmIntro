"use client";

import { useState, type FormEvent } from "react";
import { PublicTopBar } from "@/components/PublicTopBar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setErrMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setState("sent");
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
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Forgot password</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl">Reset it</h1>
          <p className="text-sm text-[#14182A]/60 mt-2 italic font-[family-name:var(--font-fraunces)]">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        {state === "sent" ? (
          <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5] text-center">
            <p className="text-sm">Reset link sent to <strong>{email}</strong>.</p>
            <p className="text-xs text-[#14182A]/60 mt-2">If it&apos;s not in your inbox in a few minutes, check spam.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 border border-[#D9CFB5] space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rice.edu or you@brown.edu"
              required
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20"
            />
            {errMsg && <p className="text-sm text-[#C86B4F]">{errMsg}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
            >
              {state === "sending" ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-xs text-[#14182A]/40">
          Remembered it? <a href="/login" className="underline hover:text-[#2E5A88]">Sign in</a>
        </p>
      </div>
    </div>
  );
}
