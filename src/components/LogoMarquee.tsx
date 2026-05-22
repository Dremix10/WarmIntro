// Bank logos in /public/logos/*.svg (see that folder's README.md for sources + licensing).
// Entries without a `logo` fall back to a tier-colored monogram tile.

import Image from "next/image";

type Bank = {
  mono: string;
  name: string;
  variant: "primary";
  logo?: string; // path under /public, omit for monogram
};

// Only banks with real SVG logos in /public/logos/. Monogram fallbacks
// were creating "we couldn't get this logo" tells in the marquee. Advisory
// and middle-market firms still appear in the product; they're just not on
// the marketing slider until we add their SVGs.
const BANKS: Bank[] = [
  { mono: "MS", name: "Morgan Stanley", variant: "primary", logo: "/logos/morganstanley.svg" },
  { mono: "GS", name: "Goldman Sachs", variant: "primary", logo: "/logos/goldmansachs.svg" },
  { mono: "JPM", name: "JPMorgan", variant: "primary", logo: "/logos/jpmorgan.svg" },
  { mono: "BAC", name: "BofA", variant: "primary", logo: "/logos/bankofamerica.svg" },
  { mono: "C", name: "Citi", variant: "primary", logo: "/logos/citi.svg" },
  { mono: "BCS", name: "Barclays", variant: "primary", logo: "/logos/barclays.svg" },
  { mono: "DB", name: "Deutsche Bank", variant: "primary", logo: "/logos/deutschebank.svg" },
];

const TILE_STYLES: Record<Bank["variant"], { tile: string; text: string }> = {
  primary: { tile: "bg-[#1B3B5F] text-white border-[#1B3B5F]", text: "text-[#14182A]" },
};

function Tile({ bank }: { bank: Bank }) {
  const s = TILE_STYLES[bank.variant];

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
            style={{ height: "auto", width: "auto" }}
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
        <p className="hidden shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472] sm:block">
          Bank coverage live ·{" "}
          <span className="text-[#1B3B5F]">major IB targets</span>
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
