"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";

const STEPS = [
  { path: "/", label: "Home", step: 0 },
  { path: "/profile", label: "Profile", step: 1 },
  { path: "/companies", label: "Companies", step: 2 },
  { path: "/pipeline", label: "Pipeline", step: 3 },
  { path: "/outreach", label: "Outreach", step: 4, noLink: true },
  { path: "/crm", label: "CRM", step: 5 },
  { path: "/network", label: "Grove", step: 6 },
  { path: "/leaderboard", label: "Board", step: 7 },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, gameState, signOut } = useAppState();

  const isOutreach = pathname.startsWith("/outreach");
  const currentStep = isOutreach
    ? 4
    : STEPS.find((s) => s.path === pathname)?.step ?? 0;

  if (pathname === "/" || pathname === "/demo" || pathname.startsWith("/design-lab")) return null;

  const canNavigate = (step: number): boolean => {
    if (step === 0) return true;
    if (step === 1) return !!profile;
    if (step >= 2) return !!profile;
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#D9CFB5] bg-[#EAE3D2]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)] hover:text-[#2E5A88] transition-colors"
        >
          alma
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {STEPS.filter((s) => s.step > 0).map((s) => {
            const active = currentStep === s.step;
            const navigable = canNavigate(s.step);
            return (
              <button
                key={s.path}
                type="button"
                onClick={() => navigable && !("noLink" in s && s.noLink) && router.push(s.path)}
                disabled={!navigable || ("noLink" in s && !!s.noLink)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#1B3B5F] text-white"
                    : navigable
                    ? "text-[#5C6472] hover:text-[#1B3B5F] hover:bg-white"
                    : "text-[#8A8674] cursor-default"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>

        <span className="text-[10px] font-medium text-[#5C6472] sm:hidden">
          {currentStep > 0 ? `${currentStep}/7` : ""}
        </span>

        <div className="flex items-center gap-2">
          {gameState && gameState.xp > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white px-3 py-1">
              <span className="text-xs font-semibold tabular-nums text-[#1B3B5F]">{gameState.xp} xp</span>
              {gameState.streak > 0 && (
                <span className="text-xs text-[#B08100]">&#x1F525; {gameState.streak}</span>
              )}
            </div>
          )}
          {session && (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-[#D9CFB5] bg-white px-3 py-1 text-xs font-medium text-[#5C6472] hover:border-[#2E5A88] hover:text-[#1B3B5F] transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
