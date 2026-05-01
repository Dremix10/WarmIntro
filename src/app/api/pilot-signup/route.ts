// POST /api/pilot-signup — capture an access request from a visitor.
// Used by both the /demo flow (after resume parse) and the lighter
// /request-access page (just email + university). Inserts into the
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

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
      name: body.name ?? null,
      university: body.university ?? null,
      major: body.major ?? null,
      graduation_year: body.graduationYear ?? null,
      skills: body.skills ? JSON.parse(JSON.stringify(body.skills)) : [],
      target_industries: body.targetIndustries ? JSON.parse(JSON.stringify(body.targetIndustries)) : [],
    }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Real-time admin ping. Fire-and-forget — don't add latency to the
    // user's response, and don't fail the signup if Telegram is down.
    // Skip synthetic CI emails (smoke-/e2e-/@example.com) so the channel
    // stays signal-only and real signups don't get drowned by test runs.
    if (isNew && !isSyntheticEmail(email)) {
      void sendTelegram(
        `📥 New Alma access request\n\n` +
          `Email: ${email}\n` +
          `Name: ${body.name ?? "(not provided)"}\n` +
          `University: ${body.university ?? "(not provided)"}\n` +
          `Major: ${body.major ?? "(not provided)"}\n` +
          `Grad year: ${body.graduationYear ?? "(not provided)"}\n\n` +
          `Approve via /admin → Reset password → email link.`
      );
    }

    return NextResponse.json({ success: true, isNew });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
