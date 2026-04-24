"use client";

import { useState } from "react";

type Channel = "email" | "linkedin";
type Tone = "casual" | "warm" | "formal";

const EMAIL_DRAFTS: Record<Tone, { subject: string; body: string }> = {
  casual: {
    subject: "Fellow Brown alum — quick question about MS TMT",
    body: `Hi Maya,

Kinsey here, a Brown junior recruiting for summer analyst. Saw you're a VP on Morgan Stanley TMT and noticed you worked on the recent software deal that just closed.

I'm trying to understand the difference between M&A on the TMT coverage side versus product-software-specific work, and what a first-year analyst actually does in TMT day-to-day.

Would you be open to a 15-minute call in the next couple of weeks? Totally fine if schedules don't line up.

Thanks either way,
Kinsey`,
  },
  warm: {
    subject: "Brown alum reaching out — would love your perspective",
    body: `Hi Maya,

I'm Kinsey, a Brown junior recruiting for summer analyst. I came across your profile and was drawn to your path — Brown Econ to MS TMT, now covering software M&A. That's the exact arc I'm trying to understand right now.

I've been learning the technicals and building a story for why banking, but the coverage-versus-product question for TMT is where I'm still getting my bearings. I'd love to hear how you made the choice, and what surprised you about your first year.

Would you have 15 minutes for a call in the next couple of weeks? I'll work around your schedule.

Thanks for considering it, Maya.

— Kinsey Harper
Brown &rsquo;27`,
  },
  formal: {
    subject: "Brown alumna outreach — networking call request",
    body: `Dear Maya,

My name is Kinsey Harper, and I am a junior at Brown University recruiting for summer analyst programs. I came across your profile while researching Morgan Stanley's TMT group, where you serve as a Vice President.

As I prepare for the 2026 cycle, I've become particularly interested in the TMT coverage group and would greatly value your perspective on the path from Brown to Morgan Stanley, and on what distinguishes a strong summer analyst in your group.

If your schedule permits, I would be grateful for the chance to speak with you for 15 minutes in the next two to three weeks.

Thank you for your time and consideration.

Best regards,
Kinsey Harper`,
  },
};

const LINKEDIN_DRAFTS: Record<Tone, string> = {
  casual: `Hey Maya! Brown junior here recruiting for summer analyst. I saw your work on the recent MS TMT software deal — would love to pick your brain for 15 minutes on coverage vs product work at Morgan Stanley. Totally fine if you're slammed.`,
  warm: `Hi Maya &mdash; Kinsey, Brown &rsquo;27. Your path from Brown Econ to MS TMT is exactly the arc I'm trying to understand as I recruit for summer analyst. Would you have 15 minutes for a networking call in the next couple of weeks?`,
  formal: `Hello Maya, I am a junior at Brown recruiting for summer analyst programs in investment banking. Would you be willing to speak for 15 minutes about your experience at Morgan Stanley TMT and your path from Brown? I would value your perspective.`,
};

export function Composer() {
  const [channel, setChannel] = useState<Channel>("email");
  const [tone, setTone] = useState<Tone>("warm");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const email = EMAIL_DRAFTS[tone];
  const linkedinBody = LINKEDIN_DRAFTS[tone];
  const body = channel === "email" ? email.body : linkedinBody;
  const limit = channel === "linkedin" ? 300 : null;
  const overLimit = limit !== null && body.length > limit;

  const handleCopy = () => {
    const text = channel === "email" ? `Subject: ${email.subject}\n\n${email.body}` : linkedinBody;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
      <div className="flex items-center justify-between border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3">
        <div className="flex gap-1 rounded-full border border-[#D9CFB5] bg-white p-0.5">
          <Tab active={channel === "email"} onClick={() => setChannel("email")}>Email</Tab>
          <Tab active={channel === "linkedin"} onClick={() => setChannel("linkedin")}>LinkedIn DM</Tab>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#5C6472]">
          <span className="uppercase tracking-wider">Draft · Alma wrote this for you</span>
        </div>
      </div>

      <div className="p-6">
        {channel === "email" && (
          <div className="mb-4 border-b border-[#ECE5D0] pb-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Subject</p>
            <p className="mt-1 text-sm font-medium text-[#14182A]">{email.subject}</p>
          </div>
        )}

        <textarea
          readOnly
          value={body}
          className="min-h-[280px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#14182A] focus:outline-none"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE5D0] pt-4">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Tone</p>
            <div className="flex gap-1 rounded-full border border-[#D9CFB5] bg-[#F8F2E2] p-0.5">
              {(["casual", "warm", "formal"] as Tone[]).map((t) => (
                <Tab key={t} active={tone === t} onClick={() => setTone(t)} compact>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Tab>
              ))}
            </div>
          </div>

          {limit !== null && (
            <p className={`text-xs tabular-nums ${overLimit ? "text-[#C86B4F]" : "text-[#5C6472]"}`}>
              {body.length} / {limit}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white px-4 py-2 text-xs font-medium text-[#1B3B5F] transition-colors hover:border-[#2E5A88] hover:bg-[#F4EDDB]"
          >
            <span>↻</span> Regenerate
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white px-4 py-2 text-xs font-medium text-[#1B3B5F] transition-colors hover:border-[#2E5A88] hover:bg-[#F4EDDB]"
            >
              {copied ? "✓ Copied" : "Copy draft"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-full bg-[#1B3B5F] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
            >
              {sent ? "✓ Marked sent · +10 xp" : "Mark as sent →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  compact,
  children,
}: {
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full font-medium transition-colors ${
        compact ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs"
      } ${active ? "bg-[#1B3B5F] text-white" : "text-[#5C6472] hover:text-[#14182A]"}`}
    >
      {children}
    </button>
  );
}
