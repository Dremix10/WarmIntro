"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { track } from "@/lib/track";

// Sign-in only. Account creation moved to invite-only via /request-access
// (waitlist) → admin approval → admin pre-mints the user via the reset-password
// flow. The previous mode toggle let anyone with an @rice.edu / @brown.edu
// address self-sign-up by calling supabase.auth.signUp() directly from the
// browser, bypassing the server-side /api/auth/signup gate. Closed.

export function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    track("signin", { method: "email" });
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@rice.edu or you@brown.edu"
            required
            className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm text-[#1F2330] placeholder:text-[#8A8674] focus:border-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-shadow"
          />
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 pr-11 text-sm text-[#1F2330] placeholder:text-[#8A8674] focus:border-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-shadow"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8674] hover:text-[#2E5A88] transition-colors"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1B3B5F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2E5A88] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
        <p className="text-center text-xs text-[#8A8674] pt-1">
          <a href="/forgot-password" className="text-[#2E5A88] hover:underline">
            Forgot password?
          </a>
        </p>
      </form>

      <div className="rounded-xl border border-dashed border-[#D9CFB5] bg-[#EAE3D2]/40 px-4 py-3 text-center text-xs text-[#5C6472]">
        New here?{" "}
        <a href="/request-access" className="font-medium text-[#1B3B5F] hover:underline">
          Request access →
        </a>
        <p className="mt-1 text-[10px] text-[#8A8674]">
          Closed beta · 100 founding users · we&rsquo;ll email you when a spot opens
        </p>
      </div>
    </div>
  );
}
