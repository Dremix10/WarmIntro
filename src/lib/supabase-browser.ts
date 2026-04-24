// Browser Supabase client — cookie-backed via @supabase/ssr so middleware can read the session
// (earlier version used createClient from supabase-js which stored sessions in localStorage only,
// which meant our gate middleware couldn't see auth state)

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createBrowserClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
