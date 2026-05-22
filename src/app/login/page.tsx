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
      // Decide where to land based on profile completeness. The original
      // path (no refreshSession). The previous version called refreshSession
      // here as a defense against stale sessions from before-password-reset
      // — but that defense raced fresh sign-ins: when AuthForm's
      // signInWithPassword succeeds, onAuthStateChange flips session to
      // truthy in AppProvider, this effect fires, and refreshSession on a
      // freshly-issued token can fail transiently (rate-limit / cookie-write
      // ordering), causing signOut() to wipe the brand-new session
      // immediately after the user signed in. The bounce-loop is then back.
      //
      // The stale-session-from-password-reset case is now killed at the
      // source by /reset-password calling signOut() before redirecting
      // here (commit 2da3073), so this defensive refresh is redundant.
      (async () => {
        try {
          const { supabase: sb } = await import("@/lib/supabase-browser");
          const { data: profile } = await sb
            .from("profiles")
            .select("target_firms")
            .eq("id", session.user.id)
            .maybeSingle();
          const needsSetup = !profile?.target_firms || profile.target_firms.length === 0;
          router.replace(needsSetup ? "/setup" : "/today");
        } catch {
          router.replace("/today");
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
