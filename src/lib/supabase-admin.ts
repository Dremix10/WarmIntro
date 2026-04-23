// Service-role Supabase client for agents that write across users
// (bankers, signals, flywheel, schema_proposals, cron-invoked flows)
// Never import this from client-side code.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — admin client requires both"
    );
  }

  cached = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
