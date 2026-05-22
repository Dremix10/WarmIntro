// Start Gmail OAuth flow — user is redirected to Google's consent page
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createOAuthState, getAuthorizationUrl } from "@/services/gmail/oauth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const state = createOAuthState(ctx.user.id);
  if (!state) return NextResponse.json({ error: "gmail_oauth_state_not_configured" }, { status: 503 });
  const url = getAuthorizationUrl(state);
  if (!url) return NextResponse.json({ error: "gmail_oauth_not_configured" }, { status: 503 });
  return NextResponse.json({ url });
}
