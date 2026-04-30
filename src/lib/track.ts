// Frontend event tracker. Writes to public.events with user_id (when
// signed in), path, and arbitrary metadata. Used for:
//   - page_view (auto, on route change via <TrackEvents>)
//   - js_error / promise_rejection (auto, via window error handlers)
//   - manual call sites — track('run_alma_clicked', { ... }), etc.
//
// Fails silently — telemetry should never break the actual app. Errors
// only log in development so we notice in dev but stay quiet in prod.

import { supabase } from "./supabase-browser";
import type { Json } from "./database.types";

let cachedUserId: string | null = null;
let cacheResolved = false;

async function getUserIdCached(): Promise<string | null> {
  if (cacheResolved) return cachedUserId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    cachedUserId = session?.user?.id ?? null;
    cacheResolved = true;
    return cachedUserId;
  } catch {
    return null;
  }
}

// Called by AppProvider on auth state change so the cache flips
// immediately after sign-in / sign-out.
export function _resetTrackUserCache() {
  cachedUserId = null;
  cacheResolved = false;
}

export function track(event: string, metadata?: Record<string, unknown>) {
  const path = typeof window !== "undefined" ? window.location.pathname : null;
  const enriched: Record<string, unknown> = {
    ...(metadata ?? {}),
    ...(path ? { path } : {}),
  };

  // Fire-and-forget. The "Anyone can insert events" RLS policy means
  // inserts work whether user_id is null or set.
  void (async () => {
    const userId = await getUserIdCached();
    const { error } = await supabase.from("events").insert({
      event,
      user_id: userId,
      // Cast to Json — we control the input shape (key: primitive/array/object).
      metadata: enriched as unknown as Json,
    });
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[track]", event, error.message);
    }
  })();
}

export function trackError(step: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
  track("error", { step, error: message, stack });
}
