"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PublicTopBar } from "@/components/PublicTopBar";
import { Confetti } from "@/components/Confetti";

// Public access-request page. Submits to /api/pilot-signup which captures
// the request and pings admins via Telegram. Approval is manual via /admin.

export default function RequestAccessPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrMsg("Email is required.");
      return;
    }
    setErrMsg(null);
    setState("submitting");
    try {
      const res = await fetch("/api/pilot-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          university: university.trim() || null,
          graduationYear: graduationYear ? Number(graduationYear) : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
        setState("error");
        return;
      }
      setConfirmationEmailSent(json.confirmationEmailSent === true);
      setState("submitted");
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 3500);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something broke.");
      setState("error");
    }
  }

  return (
    <div className="relative min-h-screen bg-[#EAE3D2] px-6 pt-32 pb-16 text-[#14182A] sm:flex sm:items-center sm:justify-center sm:py-16">
      <Confetti active={showConfetti} />
      <PublicTopBar />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">
            {state === "submitted" ? "Request received" : "50 launch seats"}
          </p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-3">
            {state === "submitted" ? "You are on the list" : "Request a seat"}
          </h1>
          <p className="text-sm text-[#14182A]/70">
            {state === "submitted"
              ? "We are processing requests in order and will follow up with next steps."
              : "Brown/Rice students get first priority for 50 launch seats, first come, first served. Early users get Alma free for the 2026 IB recruiting cycle while we tune the product around real feedback."}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {(state === "submitted"
              ? ["Request saved", confirmationEmailSent ? "Email sent" : "Email queued", "24h update"]
              : ["Brown/Rice first", "50 seats", "Free this cycle"]
            ).map((item) => (
              <div key={item} className="rounded-xl border border-[#D9CFB5] bg-white px-3 py-2 text-xs font-medium text-[#1B3B5F]">
                {item}
              </div>
            ))}
          </div>
        </div>

        {state === "submitted" ? (
          <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5] text-center shadow-[0_18px_45px_-30px_rgba(27,59,95,.45)]">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Request received.</p>
            <p className="text-sm text-[#14182A]/70 mb-3 leading-relaxed">
              {confirmationEmailSent ? "We sent a confirmation email to " : "Your request is saved under "}
              <strong>{email}</strong>.
            </p>
            <p className="text-sm text-[#14182A]/70 mb-4 leading-relaxed">
              We&rsquo;re processing requests in order. Expect an email in the next 24 hours with
              a setup link or your position on the waitlist.
            </p>
            <p className="mb-4 rounded-xl border border-[#D9CFB5] bg-[#F4EDDB] px-4 py-3 font-[family-name:var(--font-fraunces)] text-lg italic text-[#1B3B5F]">
              Your networking spreadsheet just got nervous.
            </p>
            <p className="text-xs text-[#14182A]/55 mb-4 leading-relaxed">
              School inboxes sometimes route new senders to <strong>spam</strong>{" "}on first contact.
              If you don&rsquo;t see the invite in your inbox, check there and mark{" "}
              <code className="bg-[#EAE3D2] px-1 rounded">welcome@alma.careers</code> as not-spam
              so future emails land cleanly.
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-[#1B3B5F] text-white px-5 py-3 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
            >
              Back to Alma →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 border border-[#D9CFB5] space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (your school address preferred)"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              autoComplete="name"
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none"
            />
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="School"
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none"
            />
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="Graduation year (optional)"
              min={2025}
              max={2030}
              className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none"
            />
            {errMsg && <p className="text-sm text-[#C86B4F]">{errMsg}</p>}
            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
            >
              {state === "submitting" ? "Sending..." : "Request access"}
            </button>
            <p className="text-xs text-[#14182A]/55 text-center pt-2">
              Not at Brown or Rice? Still request access. Brown/Rice are prioritized this week, and other campuses join the waitlist.
            </p>
            <p className="text-xs text-[#14182A]/55 text-center">
              Already have access? <a href="/login" className="underline text-[#2E5A88]">Sign in →</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
