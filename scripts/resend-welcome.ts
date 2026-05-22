// scripts/resend-welcome.ts — fire the new transactional welcome to a list
// of emails. Skips users who already completed password_set (they used
// the previous link), since re-sending to those would be confusing noise.
//
// Use case: we shipped a deliverability fix (less promotional copy +
// updateNote banner) after the original approve. The original welcome
// likely got Defender-quarantined; this re-sends a cleaner version with
// the explanatory note so the recipient understands why they're getting
// a second message.
//
// Usage:
//   tsx scripts/resend-welcome.ts krish_patel1@brown.edu filippos_georgantas@brown.edu

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

function loadEnvSync() {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch (err) {
    console.warn(".env.local read failed; relying on shell env", err);
  }
}

const UPDATE_NOTE = "We shipped a quick update right after sending your first welcome. This is a fresh setup link in case the first one didn't land cleanly — either link works.";

async function main() {
  loadEnvSync();
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("Usage: tsx scripts/resend-welcome.ts <email1> [<email2>...]");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();
  const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase env");
  if (!resendKey) throw new Error("Missing RESEND_API_KEY");

  // Imports are dynamic so loadEnvSync runs first — the Anthropic SDK
  // and Resend client both read env at import time.
  const { createClient } = await import("@supabase/supabase-js");
  const { buildWelcomeEmail } = await import("../src/lib/welcome-email");
  const { getFromAddress } = await import("../src/lib/email-from");
  const { WELCOME_SETUP_TOKEN_TTL_MIN } = await import("../src/lib/setup-token");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const rawEmail of targets) {
    const email = rawEmail.trim().toLowerCase();
    process.stdout.write(`${email.padEnd(40)} `);

    const { data: u, error: lookupErr } = await admin
      .from("auth_users_view")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    // auth_users_view doesn't exist in this project; fall back to admin.auth.admin
    let userId: string | null = u?.id ?? null;
    if (lookupErr || !userId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = list?.users?.find((x) => x.email?.toLowerCase() === email);
      userId = match?.id ?? null;
    }
    if (!userId) {
      console.log("✗ user not found");
      continue;
    }

    // Skip if already password_set
    const { data: existingSets } = await admin
      .from("signals")
      .select("id")
      .eq("user_id", userId)
      .eq("signal_type", "password_set")
      .limit(1);
    if (existingSets && existingSets.length > 0) {
      console.log("· already password_set — skipping");
      continue;
    }

    // Mint a fresh token (the old one is still valid until expiry; the
    // user can use whichever lands first).
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + WELCOME_SETUP_TOKEN_TTL_MIN * 60 * 1000).toISOString();
    const { error: tokenErr } = await admin.from("password_reset_tokens").insert({
      token,
      user_id: userId,
      email,
      expires_at: expiresAt,
    });
    if (tokenErr) {
      console.log(`✗ token insert failed: ${tokenErr.message}`);
      continue;
    }

    // Friendly first-name greeting if we have a profile row.
    const { data: profile } = await admin
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();
    const greeting = profile?.name ? `Hi ${(profile.name as string).split(" ")[0]}` : "Hi";

    const siteOrigin = siteUrl.replace(/\/$/, "");
    const setupLink = `${siteOrigin}/reset-password?token=${token}`;
    const forgotPath = `${siteOrigin}/forgot-password`;
    const { subject, html, text } = buildWelcomeEmail({
      greeting,
      setupLink,
      forgotPath,
      updateNote: UPDATE_NOTE,
    });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [email],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });
    const sendBody = (await r.json().catch(() => ({}))) as { id?: string };
    if (!r.ok) {
      console.log(`✗ Resend ${r.status}: ${JSON.stringify(sendBody).slice(0, 100)}`);
      await admin.from("signals").insert({
        user_id: userId,
        agent: "planner",
        signal_type: "welcome_email_failed",
        metadata: {
          via: "script_resend",
          to: email,
          from: getFromAddress(),
          error: `Resend ${r.status}`,
        },
      });
      continue;
    }

    await admin.from("signals").insert({
      user_id: userId,
      agent: "planner",
      signal_type: "welcome_email_sent",
      metadata: {
        via: "script_resend",
        to: email,
        from: getFromAddress(),
        resend_id: sendBody.id ?? null,
      },
    });
    console.log(`✓ sent (resend_id ${sendBody.id?.slice(0, 8) ?? "?"}…)`);
  }
}

main().catch((err) => {
  console.error("resend failed", err);
  process.exit(1);
});
