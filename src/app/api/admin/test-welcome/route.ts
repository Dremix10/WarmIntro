// POST /api/admin/test-welcome — admin sends a sample welcome email to
// themselves so they can preview the actual rendered version Resend will
// deliver. Same body as the real approve flow; setup link points to a
// no-op placeholder so it's safe to click without creating accounts or
// burning a real reset token.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/auth";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { isAdmin } from "@/services/auth/admin";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Admin can override the recipient AND the FROM alias. Recipient override
  // isolates Rice-side filtering (gmail control). FROM override lets us A/B
  // sender reputation — e.g. test if `hello@alma.careers` lands when
  // `noreply@alma.careers` is on a per-sender hold.
  const body = (await request.json().catch(() => ({}))) as { to?: string; fromAlias?: string };
  const adminEmail = ctx.user.email!;
  const targetEmail = (typeof body?.to === "string" && body.to.trim().includes("@"))
    ? body.to.trim()
    : adminEmail;
  // Whitelist of allowed FROM aliases — must be on alma.careers (DKIM signed).
  // Empty/invalid input falls back to noreply@.
  const fromAliasRaw = typeof body?.fromAlias === "string" ? body.fromAlias.trim().toLowerCase() : "";
  // Default to whatever ALMA_FROM_EMAIL is configured to (or the welcome@
  // default) so the test mirrors what real testers will receive. Override
  // remains available for A/B'ing alias reputation.
  const defaultFrom = (process.env.ALMA_FROM_EMAIL?.trim() ?? "Alma <welcome@alma.careers>")
    .match(/<([^@]+)@/)?.[1] ?? "welcome";
  const fromAlias = /^[a-z0-9.+_-]+$/.test(fromAliasRaw) && fromAliasRaw.length <= 32
    ? fromAliasRaw
    : defaultFrom;
  const fromAddress = `Alma <${fromAlias}@alma.careers>`;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  // The setup link uses a real-looking 64-char hex token (matches the format
  // the actual reset-password flow mints) but the token doesn't exist in the
  // password_reset_tokens table, so /reset-password renders the expired-link
  // state. Earlier we used a literal "test-preview-token-not-real" which
  // Defender's URL scanner flagged as a phishing-simulation indicator.
  const dummyToken = randomBytes(32).toString("hex");
  const setupLink = `${SITE_URL}/reset-password?token=${dummyToken}`;
  const forgotPath = `${SITE_URL.replace(/\/$/, "")}/forgot-password`;
  const greeting = "Hi";
  const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();
  const { subject, html, text } = buildWelcomeEmail({ greeting, setupLink, forgotPath });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: [targetEmail],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json({ error: `Resend ${r.status}: ${detail.slice(0, 300)}` }, { status: 502 });
    }
    const sendBody = (await r.json().catch(() => ({}))) as { id?: string };
    const emailId = sendBody.id ?? null;

    // Poll Resend for delivery status — they process async, so the first
    // GET right after POST is usually still 'sent' but bounces/blocks
    // surface within a few seconds. We try twice with a small gap.
    let deliveryStatus: string | null = null;
    let lastEvent: string | null = null;
    if (emailId) {
      for (const wait of [1500, 3000]) {
        await new Promise((resolve) => setTimeout(resolve, wait));
        const statusRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${resendKey}` },
        });
        if (statusRes.ok) {
          const j = (await statusRes.json().catch(() => ({}))) as {
            last_event?: string;
            status?: string;
          };
          deliveryStatus = j.status ?? deliveryStatus;
          lastEvent = j.last_event ?? lastEvent;
          if (lastEvent && lastEvent !== "sent") break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sentTo: targetEmail,
      sentFrom: fromAddress,
      replyTo,
      emailId,
      deliveryStatus,
      lastEvent,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
