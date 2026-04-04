"use client";

import { useState } from "react";
import type { OutreachDraft as OutreachDraftType } from "@/shared/types";

interface OutreachDraftProps {
  draft: OutreachDraftType;
  alumniLinkedinUrl?: string;
  alumniEmail?: string;
  isSent?: boolean;
  onMarkSent: () => void;
  onGenerateFollowUp?: (originalBody: string) => void;
}

export function OutreachDraft({ draft, alumniLinkedinUrl, alumniEmail, isSent = false, onMarkSent, onGenerateFollowUp }: OutreachDraftProps) {
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(isSent);

  const handleCopy = async () => {
    const text = draft.channel === "email"
      ? `Subject: ${draft.subject}\n\n${body}`
      : body;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkSent = () => {
    setSent(true);
    onMarkSent();
  };

  const isEmail = draft.channel === "email";

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      sent ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {isEmail ? "\u2709\uFE0F" : "\uD83D\uDD17"}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {draft.id.startsWith("followup-")
              ? (isEmail ? "Follow-up Email" : "Follow-up LinkedIn Message")
              : (isEmail ? "Email Draft" : "LinkedIn Message")}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            draft.tone === "warm"
              ? "bg-amber-50 text-amber-600"
              : draft.tone === "professional"
              ? "bg-blue-50 text-blue-600"
              : "bg-slate-100 text-slate-500"
          }`}>
            {draft.tone}
          </span>
        </div>
        {sent && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <span>&#10003;</span> Sent
          </span>
        )}
      </div>

      {/* Subject (email only) */}
      {isEmail && (
        <div className="px-4 py-2 border-b border-slate-100">
          <p className="text-xs text-slate-400">Subject</p>
          <p className="text-sm text-slate-700">{draft.subject}</p>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={isEmail ? 14 : 5}
          disabled={sent}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 leading-relaxed resize-none focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 transition-shadow"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={handleCopy}
          disabled={sent}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {copied ? "Copied!" : isEmail ? "Copy Email" : "Copy Message"}
        </button>

        {alumniEmail && isEmail && (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(alumniEmail);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Copy Email
          </button>
        )}

        {alumniLinkedinUrl && (
          <a
            href={alumniLinkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Open LinkedIn
          </a>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleMarkSent}
          disabled={sent}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sent ? (
            <>
              <span>&#10003;</span>
              <span>Marked as Sent</span>
            </>
          ) : (
            <>
              <span>Mark as Sent</span>
              <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px]">+10 XP</span>
            </>
          )}
        </button>

        {sent && onGenerateFollowUp && (
          <button
            type="button"
            onClick={() => onGenerateFollowUp(body)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Generate Follow-up
          </button>
        )}
      </div>
    </div>
  );
}
