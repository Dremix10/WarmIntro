"use client";

import { useEffect } from "react";

// When Supabase Auth completes a recovery (password-reset) verification, it
// redirects the user back to our Site URL with a hash like
// `#access_token=…&type=recovery&…`. If the redirect_to path was stripped
// (Supabase only fully honors redirectTo when it's an exact match in the
// Allowed Redirect URLs list — wildcards aren't always enough), the user
// lands at `/` instead of `/reset-password`. This component is mounted on
// the landing page and watches for that hash; if it sees one, it pushes the
// user to /reset-password preserving the hash so the page can pick up the
// recovery session.
export function RecoveryHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    if (!hash.includes("type=recovery")) return;
    // Already on /reset-password? do nothing.
    if (window.location.pathname === "/reset-password") return;
    window.location.replace(`/reset-password${hash}`);
  }, []);
  return null;
}
