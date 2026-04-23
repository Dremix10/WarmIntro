import Link from "next/link";

export function ArchipelagoTeaser() {
  return (
    <section className="mt-8">
      <Link
        href="/network"
        className="group flex items-stretch gap-5 overflow-hidden rounded-2xl border border-[#D9CFB5] bg-gradient-to-br from-[#F4EDDB] via-[#EFE5C8] to-[#E3D4A8] p-5 transition-colors hover:border-[#2E5A88]"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">Your archipelago</p>
          <p className="mt-2 text-lg font-[family-name:var(--font-fraunces)] italic text-[#14182A]">
            12 crossings across 5 banks.
          </p>
          <p className="mt-1 text-sm text-[#4A5260]">
            Evercore has a <span className="font-semibold text-[#1B3B5F]">home standing</span>. Morgan
            Stanley&rsquo;s walls are rising. Come see what you&rsquo;ve built.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
            View map <span aria-hidden>→</span>
          </span>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <MiniArchipelago />
        </div>
      </Link>
    </section>
  );
}

function MiniArchipelago() {
  return (
    <svg viewBox="0 0 180 110" className="h-[110px] w-[180px]">
      <defs>
        <linearGradient id="teaser-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8E6EC" />
          <stop offset="100%" stopColor="#7FA3B5" />
        </linearGradient>
        <radialGradient id="teaser-land" cx="40%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#C6D5A6" />
          <stop offset="100%" stopColor="#5F7448" />
        </radialGradient>
        <radialGradient id="teaser-beach" cx="40%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#F2DFA8" />
          <stop offset="100%" stopColor="#B89964" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="180" height="110" rx="12" fill="url(#teaser-sea)" />

      {/* Wave arcs */}
      <g stroke="#1B3B5F" strokeWidth="0.5" fill="none" opacity="0.25" strokeLinecap="round">
        <path d="M 30 80 Q 36 77 42 80" />
        <path d="M 110 90 Q 116 87 122 90" />
        <path d="M 60 95 Q 66 92 72 95" />
      </g>

      {/* Island 1 - small */}
      <g transform="translate(38 48)">
        <ellipse cx="0" cy="18" rx="16" ry="2" fill="#1B3B5F" opacity="0.2" />
        <ellipse cx="0" cy="2" rx="18" ry="12" fill="url(#teaser-beach)" />
        <ellipse cx="0" cy="0" rx="13" ry="9" fill="url(#teaser-land)" />
      </g>

      {/* Island 2 - medium with rising walls */}
      <g transform="translate(92 40)">
        <ellipse cx="0" cy="22" rx="22" ry="2.5" fill="#1B3B5F" opacity="0.2" />
        <ellipse cx="0" cy="4" rx="24" ry="15" fill="url(#teaser-beach)" />
        <ellipse cx="0" cy="2" rx="18" ry="11" fill="url(#teaser-land)" />
        {/* tiny wall */}
        <rect x="-4" y="-4" width="8" height="5" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.3" />
      </g>

      {/* Island 3 - larger with finished home */}
      <g transform="translate(145 60)">
        <ellipse cx="0" cy="20" rx="20" ry="2.5" fill="#1B3B5F" opacity="0.22" />
        <ellipse cx="0" cy="4" rx="22" ry="14" fill="url(#teaser-beach)" />
        <ellipse cx="0" cy="2" rx="16" ry="10" fill="url(#teaser-land)" />
        {/* finished house */}
        <rect x="-4" y="-4" width="8" height="6" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.3" />
        <path d="M -5 -4 L 0 -9 L 5 -4 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth="0.3" />
        <rect x="-1" y="-1" width="2" height="3" fill="#2E5A88" />
      </g>

      {/* Journey dashed line */}
      <path d="M 10 95 Q 38 70 52 55 Q 80 35 102 40 Q 130 48 145 55" fill="none" stroke="#1B3B5F" strokeWidth="1" strokeDasharray="2 3" opacity="0.55" />

      {/* Tiny boat at home port */}
      <g transform="translate(12 95)">
        <path d="M -3 0 L 3 0 L 2 2 L -2 2 Z" fill="#1B3B5F" />
        <path d="M 0 0 L 0 -4 L 3 -1 Z" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.3" />
      </g>
    </svg>
  );
}
