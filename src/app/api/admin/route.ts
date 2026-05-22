import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/** Honeypot endpoint. Any request here is suspicious — log it and return a
 *  fake success response to waste the attacker's time. */

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    // Omit cookie / authorization values to avoid storing secrets
    if (key === "cookie" || key === "authorization") {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  });
  return result;
}

async function handleHoneypot(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const headerRecord = headersToRecord(request.headers);

  // Log to Supabase events table (best-effort, never block the response)
  try {
    const supabase = createServerClient();
    await supabase.from("events").insert({
      event: "honeypot_hit",
      ip,
      user_agent: userAgent,
      metadata: { headers: headerRecord },
    });
  } catch {
    // Silently swallow — logging failure should not reveal anything
  }

  // Return a convincing fake response
  return NextResponse.json({ status: "ok" });
}

export async function GET(request: NextRequest) {
  return handleHoneypot(request);
}

export async function POST(request: NextRequest) {
  return handleHoneypot(request);
}

export async function PUT(request: NextRequest) {
  return handleHoneypot(request);
}

export async function DELETE(request: NextRequest) {
  return handleHoneypot(request);
}
