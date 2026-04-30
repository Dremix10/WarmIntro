// Bank logos in /public/logos/*.svg (see that folder's README.md for sources + licensing).
// Entries without a `logo` fall back to a tier-colored monogram tile.

import Image from "next/image";

type Bank = {
  mono: string;
  name: string;
  tier: "BB" | "EB" | "MM";
  logo?: string; // path under /public, omit for monogram
};

// Only banks with real SVG logos in /public/logos/. Monogram fallbacks
// were creating "we couldn't get this logo" tells in the marquee. EB/MM
// firms still appear in the bankers DB and in /companies — they're just
// not on the marketing slider until we add their SVGs.
const BANKS: Bank[] = [
  { mono: "MS", name: "Morgan Stanley", tier: "BB", logo: "/logos/morganstanley.svg" },
  { mono: "GS", name: "Goldman Sachs", tier: "BB", logo: "/logos/goldmansachs.svg" },
  { mono: "JPM", name: "JPMorgan", tier: "BB", logo: "/logos/jpmorgan.svg" },
  { mono: "BAC", name: "BofA", tier: "BB", logo: "/logos/bankofamerica.svg" },
  { mono: "C", name: "Citi", tier: "BB", logo: "/logos/citi.svg" },
  { mono: "BCS", name: "Barclays", tier: "BB", logo: "/logos/barclays.svg" },
  { mono: "DB", name: "Deutsche Bank", tier: "BB", logo: "/logos/deutschebank.svg" },
];

const TIER_STYLES: Record<Bank["tier"], { tile: string; text: string }> = {
  BB: { tile: "bg-[#1B3B5F] text-white border-[#1B3B5F]", text: "text-[#14182A]" },
  EB: { tile: "bg-white text-[#1B3B5F] border-[#1B3B5F]", text: "text-[#14182A]" },
  MM: { tile: "bg-white text-[#C86B4F] border-[#C86B4F]", text: "text-[#14182A]" },
};

function Tile({ bank }: { bank: Bank }) {
  const s = TIER_STYLES[bank.tier];

  return (
    <div className="flex shrink-0 items-center gap-2.5 pr-7">
      {bank.logo ? (
        <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-md border border-[#D9CFB5] bg-white p-1.5">
          <Image
            src={bank.logo}
            alt={`${bank.name} logo`}
            width={40}
            height={24}
            className="max-h-6 w-auto object-contain"
            unoptimized
          />
        </span>
      ) : (
        <span
          className={`flex h-9 min-w-[44px] shrink-0 items-center justify-center rounded-md border px-2 text-[11px] font-[family-name:var(--font-fraunces)] tracking-tight ${s.tile}`}
        >
          {bank.mono}
        </span>
      )}
      <span className={`whitespace-nowrap text-[13px] font-medium ${s.text}`}>{bank.name}</span>
    </div>
  );
}

export function LogoMarquee() {
  return (
    <div className="overflow-hidden border-y border-[#D9CFB5] bg-[#F4EDDB]">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
          Bulge Bracket coverage live ·{" "}
          <span className="text-[#1B3B5F]">EB + MM</span> rolling out
        </p>
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div
            className="flex hover:[animation-play-state:paused]"
            style={{
              animation: "marquee 90s linear infinite",
              willChange: "transform",
              width: "max-content",
            }}
          >
            {[...BANKS, ...BANKS].map((b, i) => (
              <Tile key={i} bank={b} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
