"use client";

import { useEffect, useState } from "react";

export function StickyUploadCTA({ afterPx = 700 }: { afterPx?: number }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > afterPx);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [afterPx]);

  if (dismissed || !visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
      style={{ animation: "fade-up-center 700ms cubic-bezier(.22,.75,.3,1)" }}
    >
      <div className="flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white p-1.5 shadow-lg shadow-[#1B3B5F]/10">
        <a
          href="/request-access"
          className="rounded-full bg-[#1B3B5F] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
          style={{ animation: "pulse-shadow 5.5s ease-in-out infinite" }}
        >
          Request access →
        </a>
        <a
          href="/demo"
          className="rounded-full px-4 py-2 text-xs font-medium text-[#1B3B5F] transition-colors hover:bg-[#1B3B5F]/5"
        >
          Try the demo
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5C6472] hover:bg-[#F4EDDB] hover:text-[#14182A]"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
