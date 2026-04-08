import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(new URL("/?error=auth_failed", url.origin));
  }

  // Redirect to home — the landing page detects the session and handles
  // LinkedIn auto-scrape or shows the appropriate next step
  return NextResponse.redirect(new URL("/", url.origin));
}
