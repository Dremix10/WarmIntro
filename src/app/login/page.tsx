"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAppState } from "@/components/AppProvider";
import { PublicTopBar } from "@/components/PublicTopBar";

export default function LoginPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && session) {
      // Decide where to land based on profile completeness — but FIRST verify
      // the session is server-valid. Browser supabase can think a session is
      // alive while the cookies have been revoked server-side (this happens
      // after a password reset: Supabase invalidates existing sessions, and
      // earlier middleware bug ate the rotated refresh token before the
      // browser could persist it). If we redirect to /today with a dead
      // session, middleware bounces us back here and we infinite-loop.
      //
      // Recovery: refreshSession() hits the auth server and either succeeds
      // (returning fresh tokens we keep) or fails (we sign out + show the
      // login form so the user mints a clean session).
      (async () => {
        try {
          const { supabase: sb } = await import("@/lib/supabase-browser");
          const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession();
          if (refreshErr || !refreshed.session) {
            await sb.auth.signOut().catch(() => {});
            // Stay on /login — useAppState will pick up the cleared session
            // and the form will be visible so the user can type creds.
            return;
          }
          const { data: profile } = await sb
            .from("profiles")
            .select("target_firms")
            .eq("id", refreshed.session.user.id)
            .maybeSingle();
          const needsSetup = !profile?.target_firms || profile.target_firms.length === 0;
          router.replace(needsSetup ? "/setup" : "/today");
        } catch {
          // Network blip or other transient — don't sign out, just stay
          // on /login so the user can retry manually.
        }
      })();
    }
  }, [authLoading, session, router]);

  return (
    <div className="relative min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
      <PublicTopBar />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Private beta</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl">Sign in to Alma</h1>
          <p className="text-sm text-[#14182A]/60 mt-2 italic font-[family-name:var(--font-fraunces)]">
            For approved testers only. Public launch is days away.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
          <AuthForm onSuccess={async () => {
            // Decide where to land — /setup if profile incomplete, /today otherwise
            try {
              const { supabase: sb } = await import("@/lib/supabase-browser");
              const { data: { session: s } } = await sb.auth.getSession();
              if (!s) { router.push("/today"); return; }
              const { data: profile } = await sb
                .from("profiles")
                .select("target_firms")
                .eq("id", s.user.id)
                .maybeSingle();
              const needsSetup = !profile?.target_firms || profile.target_firms.length === 0;
              router.push(needsSetup ? "/setup" : "/today");
            } catch {
              router.push("/today");
            }
          }} />
        </div>

        <p className="text-center mt-6 text-xs text-[#14182A]/40">
          <a href="/forgot-password" className="underline hover:text-[#2E5A88]">Forgot password</a>
          <span className="mx-2">·</span>
          Not a tester yet? <a href="/request-access" className="underline hover:text-[#2E5A88]">Request access</a>
        </p>
      </div>
    </div>
  );
}
