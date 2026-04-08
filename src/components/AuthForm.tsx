"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      if (!email.endsWith("@rice.edu")) {
        setError("Early access is limited to @rice.edu emails");
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setConfirmationSent(true);
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  };

  const handleOAuth = async (provider: "linkedin_oidc" | "google") => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) setError(err.message);
  };

  if (confirmationSent) {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <span className="text-2xl">{"\u2709\uFE0F"}</span>
        </div>
        <p className="text-lg font-semibold text-slate-900">Check your Rice email</p>
        <p className="text-sm text-slate-500">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <button type="button" onClick={() => { setConfirmationSent(false); setMode("signin"); }}
          className="text-sm text-emerald-600 font-medium hover:underline mt-2">
          Already confirmed? Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* OAuth buttons */}
      <button type="button" onClick={() => handleOAuth("linkedin_oidc")}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004182] transition-colors">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        Continue with LinkedIn
      </button>

      <button type="button" onClick={() => handleOAuth("google")}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or use Rice email</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your-netid@rice.edu" required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow" />
          <p className="text-xs text-slate-400 mt-1">Early access for Rice University students</p>
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (6+ characters)" required minLength={6}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow" />

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {mode === "signup" ? "Creating account..." : "Signing in..."}
            </span>
          ) : mode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        {mode === "signup" ? (
          <>Already have an account?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="text-emerald-600 font-medium hover:underline">Sign in</button>
          </>
        ) : (
          <>Need an account?{" "}
            <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="text-emerald-600 font-medium hover:underline">Sign up</button>
          </>
        )}
      </p>

      <p className="text-center text-[10px] text-slate-400">
        By signing up you agree to our{" "}
        <a href="/privacy" className="text-slate-500 hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
