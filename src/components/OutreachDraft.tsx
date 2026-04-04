"use client";

import { useState } from "react";
import type { OutreachDraft as OutreachDraftType } from "@/shared/types";

interface OutreachDraftProps {
  draft: OutreachDraftType;
  onMarkSent: () => void;
}

export function OutreachDraft({ draft, onMarkSent }: OutreachDraftProps) {
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

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
            {isEmail ? "Email Draft" : "LinkedIn Message"}
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
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={handleCopy}
          disabled={sent}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <button
          type="button"
          onClick={handleMarkSent}
          disabled={sent}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sent ? "Marked as Sent" : "Mark as Sent  +10 XP"}
        </button>
      </div>
    </div>
  );
}
