// POST /api/feedback — user-submitted feedback / bug / praise from the
// floating button inside the app. Writes to the feedback table and fires
// a Telegram alert so admins see it in real time.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendTelegram } from "@/lib/telegram";

export const runtime = "nodejs";

interface Body {
  kind?: "bug" | "feedback" | "praise";
  body?: string;
  page?: string;
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as Body;
  const kind = payload.kind;
  const body = (payload.body ?? "").trim();
  const page = (payload.page ?? "").trim().slice(0, 200) || null;

  if (!kind || !["bug", "feedback", "praise"].includes(kind)) {
    return NextResponse.json({ error: "kind must be bug, feedback, or praise" }, { status: 400 });
  }
  if (body.length < 3 || body.length > 5000) {
    return NextResponse.json({ error: "body must be 3-5000 chars" }, { status: 400 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200) || null;

  const { error } = await ctx.supabase.from("feedback").insert({
    user_id: ctx.user.id,
    email: ctx.user.email ?? "",
    kind,
    body,
    page,
    user_agent: userAgent,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Telegram so admins get the ping without polling the table. Plain
  // text (no Markdown) — feedback bodies have arbitrary punctuation.
  const emoji = kind === "bug" ? "🐛" : kind === "praise" ? "💛" : "💬";
  void sendTelegram(
    `${emoji} ${kind.toUpperCase()} from ${ctx.user.email ?? "(unknown)"}\n` +
      (page ? `On: ${page}\n` : "") +
      `\n${body.slice(0, 800)}`
  );

  return NextResponse.json({ ok: true });
}
