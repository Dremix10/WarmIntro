import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Authenticate an incoming request.
 *
 * Tries two paths in order:
 *   1. `Authorization: Bearer <jwt>` header — legacy client-side fetch with session token.
 *   2. SSR cookies (`sb-*-auth-token.*`) — set by the @supabase/ssr browser client after sign-in.
 *
 * Returns `{ user, supabase }` if either path succeeds, otherwise null.
 */
export async function getUser(request: Request) {
  // Path 1: Bearer token
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return { user, supabase };
      }
    }
  }

  // Path 2: SSR cookie-backed session
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const eq = c.indexOf("=");
      if (eq === -1) return { name: c, value: "" };
      return { name: c.slice(0, eq), value: decodeURIComponent(c.slice(eq + 1)) };
    });

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookies,
        setAll: () => {
          // Route handlers can't attach cookies via this helper — that's fine.
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { user, supabase };
  } catch {
    // fall through
  }

  return null;
}
