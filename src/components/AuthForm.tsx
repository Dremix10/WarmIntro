"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  };

  const handleLinkedIn = async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="space-y-4">
      {/* LinkedIn button */}
      <button
        type="button"
        onClick={handleLinkedIn}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004182] transition-colors"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        Continue with LinkedIn
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or use email</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@rice.edu"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (6+ characters)"
          required
          minLength={6}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
        />

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {mode === "signup" ? "Creating account..." : "Signing in..."}
            </span>
          ) : (
            mode === "signup" ? "Create Account" : "Sign In"
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        {mode === "signup" ? (
          <>Already have an account?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="text-emerald-600 font-medium hover:underline">
              Sign in
            </button>
          </>
        ) : (
          <>Need an account?{" "}
            <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="text-emerald-600 font-medium hover:underline">
              Sign up
            </button>
          </>
        )}
      </p>

      <p className="text-center text-[10px] text-slate-400 mt-2">
        By signing up you agree to our{" "}
        <a href="/privacy" className="text-slate-500 hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
