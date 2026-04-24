"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAppState } from "@/components/AppProvider";

export default function LoginPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && session) {
      router.push("/today");
    }
  }, [authLoading, session, router]);

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Private beta</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl">Sign in to Alma</h1>
          <p className="text-sm text-[#14182A]/60 mt-2 italic font-[family-name:var(--font-fraunces)]">
            For approved testers only. Public launch is days away.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
          <AuthForm onSuccess={() => router.push("/today")} />
        </div>

        <p className="text-center mt-6 text-xs text-[#14182A]/40">
          Not a tester yet? <a href="/coming-soon" className="underline hover:text-[#2E5A88]">Join the waitlist</a>.
        </p>
      </div>
    </div>
  );
}
