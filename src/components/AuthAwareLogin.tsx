"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

// Renders "Log in" for signed-out, "Your dashboard" for signed-in.
// Always safe — falls back to "Log in" on first render (SSR) until session resolves.
export function AuthAwareLogin({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(Boolean(session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(Boolean(s));
    });
    return () => subscription.unsubscribe();
  }, []);

  const href = signedIn ? "/today" : "/login";
  const label = signedIn ? "Your dashboard →" : "Log in";
  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
