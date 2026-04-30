"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { useAppState } from "@/components/AppProvider";

// Floating "Feedback" button that opens a modal with type picker + textarea.
// Mounted globally; gates itself on session + path (only authed users on
// internal routes see it). Closed-beta users tap this when something looks
// broken; we get a Telegram alert + a feedback row keyed to their user.
// Cheaper than email, more structured than Slack DM.

const HIDE_ON_ROUTES = [
  "/",
  "/demo",
  "/coming-soon",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/request-access",
  "/privacy",
  "/terms",
];

type Kind = "bug" | "feedback" | "praise";

const KIND_META: Record<Kind, { emoji: string; label: string; placeholder: string }> = {
  bug: {
    emoji: "🐛",
    label: "Bug",
    placeholder: "What broke? What were you trying to do?",
  },
  feedback: {
    emoji: "💬",
    label: "Feedback",
    placeholder: "What's missing, confusing, or could be better?",
  },
  praise: {
    emoji: "💛",
    label: "Praise",
    placeholder: "What worked? What surprised you?",
  },
};

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const pathname = usePathname();
  const { session } = useAppState();

  // Hide on public/auth/legal routes + design-lab + when signed out.
  if (!session) return null;
  if (HIDE_ON_ROUTES.includes(pathname) || pathname.startsWith("/design-lab")) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (body.trim().length < 3) {
      setErrMsg("A few more words please.");
      return;
    }
    setErrMsg(null);
    setState("sending");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s?.access_token ?? ""}`,
        },
        body: JSON.stringify({ kind, body: body.trim(), page: pathname }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setState("sent");
      setBody("");
      window.setTimeout(() => {
        setOpen(false);
        setState("idle");
      }, 1500);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Send failed");
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[#1B3B5F] text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-[#1B3B5F]/20 hover:bg-[#2E5A88] transition-colors"
        aria-label="Send feedback"
      >
        💬 Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#14182A]/40 backdrop-blur-sm"
          onClick={() => state !== "sending" && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D9CFB5] max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state === "sent" ? (
              <div className="text-center py-4">
                <p className="font-[family-name:var(--font-fraunces)] text-xl mb-1">Got it.</p>
                <p className="text-sm text-[#14182A]/60 italic font-[family-name:var(--font-fraunces)]">We read everything.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold mb-1">Tell us</p>
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mb-4">
                  Send feedback
                </h3>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(Object.keys(KIND_META) as Kind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        kind === k
                          ? "bg-[#1B3B5F] text-white border-[#1B3B5F]"
                          : "bg-white text-[#14182A]/70 border-[#D9CFB5] hover:border-[#2E5A88]"
                      }`}
                    >
                      {KIND_META[k].emoji} {KIND_META[k].label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={KIND_META[kind].placeholder}
                  rows={5}
                  required
                  spellCheck
                  className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm focus:border-[#2E5A88] focus:outline-none resize-none"
                />

                {errMsg && <p className="text-sm text-[#C86B4F] mt-2">{errMsg}</p>}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={state === "sending"}
                    className="rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium hover:bg-[#EAE3D2] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state === "sending" || body.trim().length < 3}
                    className="rounded-lg bg-[#1B3B5F] text-white px-4 py-2 text-sm font-medium hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
                  >
                    {state === "sending" ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
