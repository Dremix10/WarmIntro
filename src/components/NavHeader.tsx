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
  { path: "/leaderboard", label: "Board", step: 6 },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, gameState, signOut } = useAppState();

  const isOutreach = pathname.startsWith("/outreach");
  const currentStep = isOutreach
    ? 4
    : STEPS.find((s) => s.path === pathname)?.step ?? 0;

  if (pathname === "/" || pathname === "/demo") return null;

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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <button type="button" onClick={() => router.push("/")}
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-emerald-600 transition-colors">
          Warm<span className="text-emerald-600">Intro</span>
        </button>

        {/* Step indicators */}
        <nav className="hidden sm:flex items-center gap-1">
          {STEPS.filter((s) => s.step > 0).map((s) => {
            const active = currentStep === s.step;
            const completed = currentStep > s.step;
            const navigable = canNavigate(s.step);

            return (
              <button key={s.path} type="button"
                onClick={() => navigable && !("noLink" in s && s.noLink) && router.push(s.path)}
                disabled={!navigable || ("noLink" in s && !!s.noLink)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-emerald-50 text-emerald-700"
                    : completed ? "text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    : navigable ? "text-slate-400 hover:text-slate-600 cursor-pointer"
                    : "text-slate-300 cursor-default"
                }`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? "bg-emerald-600 text-white"
                    : completed ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {completed ? "\u2713" : s.step}
                </span>
                <span className="hidden md:inline">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile step indicator */}
        <span className="sm:hidden text-xs font-medium text-slate-400">
          {currentStep > 0 ? `${currentStep}/6` : ""}
        </span>

        {/* Right side: XP + logout */}
        <div className="flex items-center gap-2">
          {gameState && gameState.xp > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
              <span className="text-xs font-bold text-emerald-600">{gameState.xp} XP</span>
              {gameState.streak > 0 && (
                <span className="text-xs text-amber-500">&#x1F525;{gameState.streak}</span>
              )}
            </div>
          )}
          {session && (
            <button type="button" onClick={handleSignOut}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
