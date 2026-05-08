// POST /api/admin/followups/batch — admin-only fast path for launch/demo
// follow-ups. It finds sent/no-reply connections, creates short approved
// follow-up drafts, mirrors them into Gmail Drafts, and optionally sends
// immediately when the admin explicitly passes mode="send".

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/services/auth/admin";
import { runBatchFollowups } from "@/services/outreach/batchFollowups";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  minAgeHours?: number;
  dryRun?: boolean;
  mode?: "draft" | "send";
  confirmSend?: boolean;
  userEmails?: string[];
  limit?: number;
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const mode = body.mode === "send" ? "send" : "draft";
  if (mode === "send" && body.confirmSend !== true) {
    return NextResponse.json({ error: "confirmSend=true required for immediate sends" }, { status: 400 });
  }

  const minAgeHours = typeof body.minAgeHours === "number" && body.minAgeHours >= 1 && body.minAgeHours <= 336
    ? body.minAgeHours
    : 36;
  const limit = typeof body.limit === "number" && body.limit > 0 && body.limit <= 100 ? body.limit : undefined;
  const userEmails = Array.isArray(body.userEmails)
    ? body.userEmails.filter((e): e is string => typeof e === "string" && e.includes("@"))
    : undefined;

  const result = await runBatchFollowups({
    minAgeHours,
    dryRun: body.dryRun ?? true,
    mode,
    limit,
    userEmails,
  });

  return NextResponse.json({ ok: true, result });
}
