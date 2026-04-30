"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Mounted globally in app/layout. Three jobs:
//   1. fire 'page_view' on every route change
//   2. capture window.onerror (uncaught JS errors)
//   3. capture window.unhandledrejection (uncaught promise rejections)
//
// Telemetry never breaks the app — the track() helper is fire-and-forget
// and silent on failure. Hooks are idempotent: only one listener is
// registered regardless of remount.

export function TrackEvents() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Page view tracking. Fires on every pathname change, debounced via
  // ref so a re-render with the same path doesn't double-fire.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    track("page_view", { path: pathname });
  }, [pathname]);

  // Error handlers — registered ONCE for the lifetime of the app, not
  // per-route. Removed on unmount of this component (which is layout-
  // mounted, so effectively never unmounts).
  useEffect(() => {
    function onError(event: ErrorEvent) {
      track("js_error", {
        message: event.message?.slice(0, 500),
        source: event.filename?.slice(0, 200),
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack?.slice(0, 800),
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      track("promise_rejection", {
        reason: typeof reason === "string" ? reason.slice(0, 500) : reason instanceof Error ? reason.message?.slice(0, 500) : String(reason).slice(0, 500),
        stack: reason instanceof Error ? reason.stack?.slice(0, 800) : undefined,
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
