// Gmail OAuth callback — exchange auth code for tokens, persist encrypted, return success

import { NextResponse } from "next/server";
import { exchangeCodeForTokens, encryptToken } from "@/services/gmail/oauth";
import { getAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

interface OAuthState {
  userId: string;
  ts: number;
}

function decodeState(state: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return NextResponse.redirect(new URL(`/setup?gmail_error=${oauthError}`, request.url));
  if (!code || !stateRaw) return NextResponse.redirect(new URL("/setup?gmail_error=missing_params", request.url));

  const state = decodeState(stateRaw);
  if (!state) return NextResponse.redirect(new URL("/setup?gmail_error=bad_state", request.url));
  // State must be fresh (< 10 min)
  if (Date.now() - state.ts > 10 * 60 * 1000) return NextResponse.redirect(new URL("/setup?gmail_error=state_expired", request.url));

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) return NextResponse.redirect(new URL("/setup?gmail_error=token_exchange_failed", request.url));

  // Fetch user's email from Google to persist as gmail_email
  let gmailEmail: string | undefined;
  try {
    const uiRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (uiRes.ok) {
      const info = (await uiRes.json()) as { email?: string };
      gmailEmail = info.email;
    }
  } catch {
    // optional
  }

  const admin = getAdminClient();

  // Look up existing profile to preserve its NOT NULL fields when upserting
  const { data: existing } = await admin
    .from("profiles")
    .select("name, major, graduation_year, university, email")
    .eq("id", state.userId)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(state.userId);
  const authEmail = authUser?.user?.email ?? gmailEmail ?? existing?.email ?? "";
  const fallbackUniversity = authEmail.endsWith("@brown.edu") ? "Brown University" : "Rice University";

  const payload = {
    id: state.userId,
    email: existing?.email ?? authEmail,
    name: existing?.name ?? authUser?.user?.user_metadata?.full_name ?? authEmail.split("@")[0] ?? "Student",
    major: existing?.major ?? "Undeclared",
    graduation_year: existing?.graduation_year ?? new Date().getFullYear() + 3,
    university: existing?.university ?? fallbackUniversity,
    gmail_refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
    gmail_access_token_encrypted: encryptToken(tokens.access_token),
    gmail_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    gmail_scopes: tokens.scope.split(" "),
    gmail_connected_at: new Date().toISOString(),
    gmail_email: gmailEmail,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("profiles").upsert(payload as never, { onConflict: "id" });
  if (error) {
    console.error("[gmail/callback] profile upsert failed", error);
    return NextResponse.redirect(new URL(`/setup?gmail_error=persist_failed`, request.url));
  }

  return NextResponse.redirect(new URL("/setup?gmail=connected", request.url));
}
