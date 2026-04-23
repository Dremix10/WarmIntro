"use client";

import { useState } from "react";

type Channel = "email" | "linkedin";
type Tone = "casual" | "warm" | "formal";

const EMAIL_DRAFTS: Record<Tone, { subject: string; body: string }> = {
  casual: {
    subject: "Fellow Brown CS — quick question about Linear",
    body: `Hi Maya,

Kinsey here — I'm a Brown CS junior and I saw you're on the product team at Linear. I've been using Linear for my side projects all year and the attention to detail is wild in the best way.

I'm exploring summer SWE internships in developer tools and Linear is at the top of my list. Would you be open to a 15-minute chat about what your product team looks for, and what your first year was like?

Totally fine if not — I know schedules get nuts. Either way, thanks for building something I actually want to use.

— Kinsey`,
  },
  warm: {
    subject: "Brown CS reaching out — would love your perspective",
    body: `Hi Maya,

I'm Kinsey, a CS junior at Brown — I noticed you're at Linear and thought I'd reach out.

I've been thinking a lot about product-engineering crossover roles this year, and Linear's the team I keep coming back to. Your craft shows up in the product in a way that's hard to fake. I'd love to hear how you ended up there from Brown, and what the path from CS student to senior PM looked like.

Would you be open to a 15-minute coffee or call in the next couple of weeks? Happy to work around your schedule.

Thanks for considering it either way, Maya.

— Kinsey Harper
Brown CS '27`,
  },
  formal: {
    subject: "Brown CS alumna outreach — informational interview request",
    body: `Dear Maya,

My name is Kinsey Harper, and I am a junior at Brown University studying Computer Science. I came across your profile while researching Linear, where you serve as a Senior Product Manager.

As I explore internship opportunities for Summer 2026, I've become particularly interested in developer-tools companies where engineering and product craft are closely linked. I would greatly appreciate the opportunity to speak with you for 15 minutes about your experience at Linear and your path from Brown.

If your schedule permits, I would be grateful for the chance to connect in the next two to three weeks.

Thank you for your time and consideration.

Best regards,
Kinsey Harper`,
  },
};

const LINKEDIN_DRAFTS: Record<Tone, string> = {
  casual: `Hey Maya! Brown CS junior here. I use Linear daily and the craft blows me away. Exploring dev-tools internships for the summer — would you be up for a quick 15 min to trade notes? Totally fine if not.`,
  warm: `Hi Maya — Kinsey from Brown CS. I keep coming back to Linear in my research on dev-tools internships, and your path from Brown → senior PM is exactly the kind of story I'd love to learn from. Would you have 15 minutes for a call in the next couple of weeks?`,
  formal: `Hello Maya, I am a junior at Brown CS researching Summer 2026 internships in developer tools. Would you be willing to speak for 15 minutes about your experience at Linear? I would value your perspective.`,
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
