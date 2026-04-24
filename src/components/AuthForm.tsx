"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { track } from "@/lib/track";

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
      if (!email.endsWith("@rice.edu")) {
        setError("Early access is limited to @rice.edu emails");
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      track("signup", { method: "email" });
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      track("signin", { method: "email" });
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your-netid@rice.edu" required
            className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm text-[#1F2330] placeholder:text-[#8A8674] focus:border-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-shadow" />
          <p className="text-xs text-[#8A8674] mt-1">Early access for Rice University students</p>
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (6+ characters)" required minLength={6}
          className="w-full rounded-xl border border-[#D9CFB5] bg-white px-4 py-3 text-sm text-[#1F2330] placeholder:text-[#8A8674] focus:border-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-shadow" />

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-[#1B3B5F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2E5A88] disabled:opacity-50 transition-colors">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {mode === "signup" ? "Creating account..." : "Signing in..."}
            </span>
          ) : mode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-[#8A8674]">
        {mode === "signup" ? (
          <>Already have an account?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="text-[#1B3B5F] font-medium hover:underline">Sign in</button>
          </>
        ) : (
          <>Need an account?{" "}
            <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="text-[#1B3B5F] font-medium hover:underline">Sign up</button>
          </>
        )}
      </p>

      <p className="text-center text-[10px] text-[#8A8674]">
        By signing up you agree to our{" "}
        <a href="/privacy" className="text-[#5C6472] hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
