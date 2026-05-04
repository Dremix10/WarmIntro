"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";

const NAV_ITEMS = [
  { path: "/today", label: "Today" },
  { path: "/deck", label: "Deck" },
  { path: "/pipeline", label: "Pipeline" },
];

const HIDE_NAV_ROUTES = [
  "/",
  "/demo",
  "/coming-soon",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAppState();

  // Hide on public marketing/auth/legal routes and any design-lab preview
  if (HIDE_NAV_ROUTES.includes(pathname) || pathname.startsWith("/design-lab")) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#D9CFB5] bg-[#EAE3D2]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Alma — home"
          className="shrink-0 text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)] hover:text-[#2E5A88] transition-colors"
        >
          alma
        </button>

        {session && (
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-hidden">
            {NAV_ITEMS.map((s) => {
              const active = pathname === s.path;
              return (
                <button
                  key={s.path}
                  type="button"
                  onClick={() => router.push(s.path)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#1B3B5F] text-white"
                      : "text-[#5C6472] hover:text-[#1B3B5F] hover:bg-white"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => router.push("/account")}
                aria-label="Account"
                className={`rounded-full p-2 transition-colors ${
                  pathname.startsWith("/account") ? "bg-[#1B3B5F] text-white" : "text-[#5C6472] hover:bg-white hover:text-[#1B3B5F]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden sm:inline-flex rounded-full border border-[#D9CFB5] bg-white px-3 py-1 text-xs font-medium text-[#5C6472] hover:border-[#2E5A88] hover:text-[#1B3B5F] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="rounded-full border border-[#D9CFB5] bg-white px-3 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88] transition-colors"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
