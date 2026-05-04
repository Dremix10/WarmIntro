"use client";

import { useState, type FormEvent } from "react";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/pilot-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("signup_failed");
      setStatus("ok");
      setMessage("You're on the list. We will reach out as we open the founding cohort.");
    } catch {
      setStatus("err");
      setMessage("Hmm, something broke. Try again in a bit.");
    }
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-4">Request list open</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-5xl sm:text-6xl mb-4">Alma</h1>
        <p className="text-lg text-[#14182A]/70 font-[family-name:var(--font-fraunces)] italic mb-8">
          The email-first recruiting agent for students breaking into IB.
        </p>

        <p className="text-sm text-[#14182A]/60 mb-6">
          The product is gated while we onboard students carefully. Drop your email and we&apos;ll send access as spots open.
        </p>

        {status === "ok" ? (
          <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5]">
            <p className="text-sm text-[#2E5A88] font-medium">{message}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rice.edu"
              className="flex-1 rounded-xl bg-white border border-[#D9CFB5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-xl bg-[#2E5A88] text-white px-6 py-3 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-50"
            >
              {status === "submitting" ? "..." : "Get early access"}
            </button>
          </form>
        )}
        {status === "err" && <p className="text-sm text-[#C86B4F] mt-3">{message}</p>}

        <p className="mt-10 text-xs text-[#14182A]/40">Built by Rice, Brown and MIT students.</p>
        <p className="mt-2 text-xs text-[#14182A]/40">
          Testers: <a href="/login" className="underline hover:text-[#2E5A88]">sign in</a>.
        </p>
      </div>
    </div>
  );
}
