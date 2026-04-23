export function ScenePreview() {
  return (
    <div className="relative aspect-[16/8] w-full bg-gradient-to-b from-[#D8E6EC] via-[#B8CEDB] to-[#8FB0BF]">
      <svg viewBox="0 0 1200 600" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="sp-sun" cx="85%" cy="15%" r="45%">
            <stop offset="0%" stopColor="#FFE8A8" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#FFE8A8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFE8A8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sp-beach" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#F6E7B6" />
            <stop offset="100%" stopColor="#B89964" />
          </radialGradient>
          <radialGradient id="sp-land" cx="35%" cy="32%" r="85%">
            <stop offset="0%" stopColor="#C6D5A6" />
            <stop offset="100%" stopColor="#5F7448" />
          </radialGradient>
        </defs>

        <rect width="1200" height="600" fill="url(#sp-sun)" />

        <g stroke="#1B3B5F" strokeWidth="0.8" fill="none" opacity="0.18" strokeLinecap="round">
          <path d="M 60 420 Q 75 413 90 420" />
          <path d="M 180 470 Q 195 463 210 470" />
          <path d="M 410 450 Q 425 443 440 450" />
          <path d="M 640 510 Q 655 503 670 510" />
          <path d="M 920 470 Q 935 463 950 470" />
          <path d="M 1060 520 Q 1075 513 1090 520" />
          <path d="M 310 280 Q 322 273 334 280" />
          <path d="M 820 250 Q 834 243 848 250" />
        </g>

        <g stroke="#1B3B5F" strokeWidth="1" fill="none" opacity="0.28" strokeLinecap="round">
          <path d="M 230 100 Q 240 93 250 100 Q 260 93 270 100" />
          <path d="M 900 130 Q 912 123 924 130 Q 936 123 948 130" />
        </g>

        {/* Island 1 — logs/foundation */}
        <g transform="translate(220 380) rotate(-4)">
          <ellipse cx="12" cy="68" rx="100" ry="9" fill="#1B3B5F" opacity="0.22" />
          <ellipse cx="0" cy="0" rx="110" ry="60" fill="url(#sp-beach)" />
          <ellipse cx="-4" cy="-8" rx="88" ry="46" fill="url(#sp-land)" />
          <ellipse cx="-30" cy="-20" rx="22" ry="8" fill="#5F7448" opacity="0.5" />
          {/* Foundation stones */}
          <g transform="translate(-10 -10) scale(1.8)">
            <ellipse cx="0" cy="7" rx="10" ry="1.8" fill="#1B3B5F" opacity="0.25" />
            <rect x="-7" y="3" width="4.5" height="3" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
            <rect x="-2" y="3" width="4" height="3" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
            <rect x="2.5" y="3" width="4.5" height="3" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
            <rect x="-6.5" y="-0.2" width="4" height="2.8" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
            <rect x="-2" y="-0.2" width="4" height="2.8" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
            <rect x="2.5" y="-0.2" width="3.8" height="2.8" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
          </g>
        </g>

        {/* Island 2 — walls rising */}
        <g transform="translate(600 330) rotate(3)">
          <ellipse cx="6" cy="76" rx="120" ry="10" fill="#1B3B5F" opacity="0.22" />
          <ellipse cx="0" cy="0" rx="130" ry="65" fill="url(#sp-beach)" />
          <ellipse cx="-4" cy="-8" rx="106" ry="50" fill="url(#sp-land)" />
          <ellipse cx="-26" cy="-22" rx="28" ry="10" fill="#5F7448" opacity="0.5" />
          <ellipse cx="32" cy="-10" rx="24" ry="8" fill="#5F7448" opacity="0.45" />
          {/* Walls rising */}
          <g transform="translate(-6 -12) scale(2)">
            <ellipse cx="0" cy="8" rx="11" ry="1.8" fill="#1B3B5F" opacity="0.27" />
            <rect x="-7" y="5.4" width="14" height="1.6" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.35" />
            <rect x="-6" y="-1.2" width="12" height="6.6" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.55" />
            <rect x="-1.5" y="1.8" width="3" height="3.6" fill="#6E6246" opacity="0.35" stroke="#1B3B5F" strokeWidth="0.4" />
            <path d="M -6 -1.2 L 6 -1.2" stroke="#1B3B5F" strokeWidth="0.7" strokeDasharray="2 1.5" fill="none" opacity="0.6" />
          </g>
        </g>

        {/* Island 3 — finished home */}
        <g transform="translate(960 400) rotate(-5)">
          <ellipse cx="10" cy="72" rx="110" ry="10" fill="#1B3B5F" opacity="0.24" />
          <ellipse cx="0" cy="0" rx="120" ry="62" fill="url(#sp-beach)" />
          <ellipse cx="-4" cy="-8" rx="96" ry="48" fill="url(#sp-land)" />
          <ellipse cx="-28" cy="-22" rx="26" ry="9" fill="#5F7448" opacity="0.5" />
          {/* Finished home */}
          <g transform="translate(-4 -14) scale(2.2)">
            <ellipse cx="0" cy="9" rx="13" ry="2.2" fill="#1B3B5F" opacity="0.3" />
            <rect x="-7" y="-2.5" width="14" height="10.5" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.6" />
            <path d="M -8.5 -2.5 L 0 -11.5 L 8.5 -2.5 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M -8 -2.5 L 0 -11 L 0 -10.3 L -7 -2.5 Z" fill="#DB7E5E" />
            <rect x="3.8" y="-8.5" width="1.6" height="3.5" fill="#8A7355" stroke="#1B3B5F" strokeWidth="0.3" />
            <rect x="-1.9" y="2" width="3.8" height="6" fill="#2E5A88" stroke="#1B3B5F" strokeWidth="0.4" />
            <circle cx="1.3" cy="5" r="0.35" fill="#E8B339" />
            <rect x="-5.6" y="0.5" width="2.6" height="2.6" fill="#A9C4D2" stroke="#1B3B5F" strokeWidth="0.35" />
            <rect x="3" y="0.5" width="2.6" height="2.6" fill="#A9C4D2" stroke="#1B3B5F" strokeWidth="0.35" />
            <circle cx="-8.2" cy="3.5" r="1" fill="#E85A7C" opacity="0.9" />
            <circle cx="-8.6" cy="5.6" r="1.2" fill="#D84D6E" opacity="0.85" />
            <circle cx="-7.2" cy="5" r="0.8" fill="#E85A7C" opacity="0.85" />
          </g>
        </g>

        {/* Dashed journey */}
        <path
          d="M 80 500 C 160 440 200 400 230 380 C 340 360 500 340 600 330 C 750 340 880 390 960 400"
          fill="none"
          stroke="#1B3B5F"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Home port */}
        <g transform="translate(80 500)">
          <ellipse cx="0" cy="28" rx="50" ry="7" fill="#1B3B5F" opacity="0.2" />
          <ellipse cx="0" cy="0" rx="48" ry="22" fill="url(#sp-beach)" />
          <ellipse cx="-3" cy="-5" rx="38" ry="16" fill="url(#sp-land)" />
          <rect x="-5" y="-12" width="10" height="12" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.6" />
          <path d="M -7 -12 L 0 -20 L 7 -12 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth="0.6" />
          <text y="42" textAnchor="middle" fontSize="13" fill="#1B3B5F" fontFamily="var(--font-fraunces)" fontStyle="italic" fontWeight="500">Home</text>
        </g>
      </svg>

      <div className="absolute left-6 bottom-5 max-w-sm rounded-2xl bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Your archipelago</p>
        <p className="mt-1.5 text-sm font-[family-name:var(--font-fraunces)] italic text-[#14182A]">
          From a cold inbox to a home standing on its own island.
        </p>
      </div>
    </div>
  );
}
