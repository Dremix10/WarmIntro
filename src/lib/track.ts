import { supabase } from "./supabase-browser";

export function track(event: string, metadata?: Record<string, unknown>) {
  supabase.from("events").insert({
    event,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
  }).then(({ error }) => {
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[track]", event, error.message);
    }
  });
}

export function trackError(step: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
  track("demo_error", { step, error: message, stack });
}
