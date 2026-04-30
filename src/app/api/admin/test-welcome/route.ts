// POST /api/admin/test-welcome — admin sends a sample welcome email to
// themselves so they can preview the actual rendered version Resend will
// deliver. Same body as the real approve flow; setup link points to a
// no-op placeholder so it's safe to click without creating accounts or
// burning a real reset token.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "dc118@rice.edu,evangelos_paraskeva@brown.edu")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

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
  const fromAlias = /^[a-z0-9.+_-]+$/.test(fromAliasRaw) && fromAliasRaw.length <= 32
    ? fromAliasRaw
    : "noreply";
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

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6"><div style="max-width:520px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p><p style="font-size:18px;font-weight:500;margin:0 0 12px 0">${greeting} — you&rsquo;re in.</p><p style="margin:0 0 18px 0">Your access to Alma&rsquo;s closed beta is approved. Click below to set a password and finish onboarding right inside the app.</p><p style="margin:24px 0;text-align:center"><a href="${setupLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">Set up my account →</a></p><p style="margin:0 0 8px 0;font-size:13px;color:#5C6472">The link is good for one hour. Once you&rsquo;re in, Alma walks you through resume upload and firm picks — about three minutes.</p><p style="margin:0 0 18px 0;font-size:13px;color:#5C6472">Missed the window? Head to <a href="${forgotPath}" style="color:#2E5A88">${forgotPath}</a> and we&rsquo;ll send a fresh one.</p><hr style="border:0;border-top:1px solid #D9CFB5;margin:28px 0"><p style="margin:0 0 14px 0;font-size:14px"><strong>Founding-user perk:</strong> the full 2026 recruiting cycle is free for you. We&rsquo;ll roll out paid tiers after launch — you&rsquo;re grandfathered.</p><p style="margin:0 0 14px 0;font-size:14px">Some rough edges are expected — we&rsquo;re shipping fixes daily. Hit the floating <strong>Feedback</strong> button inside the app once you&rsquo;re signed in. We read everything.</p><p style="margin:24px 0 0 0;font-size:13px;color:#5C6472">— Demetris, Evangelos, Christos, Theofanis<br>4 students at Rice, Brown, and MIT, in the IB cycle right now too.</p></div></body></html>`;
  const textBody = `${greeting} — you're in.\n\nYour access to Alma's closed beta is approved. Set a password here:\n${setupLink}\n\nGood for one hour. Once you're in, Alma walks you through resume upload and firm picks (~3 min).\n\nMissed the window? Head to ${forgotPath} and we'll send a fresh one.\n\nFounding-user perk: the full 2026 recruiting cycle is free for you. We'll roll out paid tiers after launch — you're grandfathered.\n\nSome rough edges are expected — we're shipping fixes daily. Use the Feedback button inside the app to flag anything.\n\n— Demetris, Evangelos, Christos, Theofanis\n4 students at Rice, Brown, and MIT, in the IB cycle right now too.`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: [targetEmail],
        reply_to: replyTo,
        subject: "You're in — Alma is yours",
        text: textBody,
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
