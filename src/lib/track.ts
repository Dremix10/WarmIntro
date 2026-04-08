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
