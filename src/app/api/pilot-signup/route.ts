// POST /api/pilot-signup — capture an access request from a visitor.
// Used by /request-access and any old clients still posting the same shape.
// Inserts into the
// pilot_signups table — admin reviews and approves manually via the
// admin reset-password flow.
//
// Fires a Telegram alert on every new request so admins get real-time
// pings instead of having to poll the table. Closed-beta posture: 100
// users max while Gmail OAuth is in testing mode.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendTelegram } from "@/lib/telegram";
import { isSyntheticEmail } from "@/lib/synthetic-email";
import { getFromAddress } from "@/lib/email-from";
import { buildAccessRequestConfirmationEmail } from "@/lib/access-request-email";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, maxLength))
    .filter((item): item is string => !!item)
    .slice(0, maxItems);
}

function cleanGraduationYear(value: unknown): number | null {
  const year = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2040) return null;
  return year;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    const name = cleanString(body.name, 120);
    const university = cleanString(body.university, 120);
    const major = cleanString(body.major, 120);
    const graduationYear = cleanGraduationYear(body.graduationYear);
    const skills = cleanStringArray(body.skills, 20, 80);
    const targetIndustries = cleanStringArray(body.targetIndustries, 20, 80);

    const supabase = createServerClient();
    // upsert on email — re-submitting the same email updates the row
    // (e.g., they fill out the demo a second time with more profile data)
    // rather than creating duplicates.
    const { data: existing } = await supabase
      .from("pilot_signups")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const isNew = !existing;

    const { error } = await supabase.from("pilot_signups").upsert({
      email,
      name,
      university,
      major,
      graduation_year: graduationYear,
      skills,
      target_industries: targetIndustries,
    }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let confirmationEmailSent = false;
    let confirmationEmailError: string | null = null;
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!isSyntheticEmail(email) && resendKey) {
      const firstName = name?.split(" ")[0] ?? null;
      const { subject, html, text } = buildAccessRequestConfirmationEmail({
        firstName,
        requestEmail: email,
        siteUrl: SITE_URL,
      });
      const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();
      try {
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
        confirmationEmailSent = r.ok;
        if (!r.ok) {
          confirmationEmailError = `Resend ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`;
        }
      } catch (err) {
        confirmationEmailError = err instanceof Error ? err.message : String(err);
      }
    } else if (!resendKey) {
      confirmationEmailError = "RESEND_API_KEY not set";
    }

    // Real-time admin ping. Fire-and-forget — don't add latency to the
    // user's response, and don't fail the signup if Telegram is down.
    // Skip synthetic CI emails (smoke-/e2e-/@example.com) so the channel
    // stays signal-only and real signups don't get drowned by test runs.
    if (isNew && !isSyntheticEmail(email)) {
      void sendTelegram(
          `📥 New Alma access request\n\n` +
          `Email: ${email}\n` +
          `Name: ${name ?? "(not provided)"}\n` +
          `University: ${university ?? "(not provided)"}\n` +
          `Major: ${major ?? "(not provided)"}\n` +
          `Grad year: ${graduationYear ?? "(not provided)"}\n` +
          `Confirmation email: ${confirmationEmailSent ? "sent" : `not sent (${confirmationEmailError ?? "skipped"})`}\n\n` +
          `Approve via /admin → Reset password → email link.`
      );
    }

    return NextResponse.json({ success: true, isNew, confirmationEmailSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
