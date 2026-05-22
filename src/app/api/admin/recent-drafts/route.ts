// GET /api/admin/recent-drafts — admin-only firehose of the last N drafts
// across all users, joined to banker + firm + the latest critic_review +
// skip_reason. Powers /admin/drafts (the prompt-iteration scratchpad).
//
// Tight column list — body and feedback are the load-bearing fields, the
// rest are headers for triage.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";
import { isAdmin } from "@/services/auth/admin";

export const runtime = "nodejs";

interface Row {
  id: string;
  user_id: string;
  banker_id: string | null;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  pre_edit_ai_body: string | null;
  user_edited_body: string | null;
  skip_reason: string | null;
  iteration_count: number;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  draft_id: string;
  overall_score: number | null;
  scores: Json | null;
  verdict: string;
  feedback: string | null;
  created_at: string;
}

interface BankerRow { id: string; name: string; title: string | null; firm_id: string | null }
interface FirmRow { id: string; name: string }

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: drafts, error: draftsErr } = await admin
    .from("drafts")
    .select("id, user_id, banker_id, type, status, subject, body, pre_edit_ai_body, user_edited_body, skip_reason, iteration_count, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (draftsErr) return NextResponse.json({ error: draftsErr.message }, { status: 500 });

  const draftRows = (drafts ?? []) as Row[];
  const draftIds = draftRows.map((d) => d.id);
  const bankerIds = Array.from(new Set(draftRows.map((d) => d.banker_id).filter(Boolean) as string[]));
  const userIds = Array.from(new Set(draftRows.map((d) => d.user_id)));

  // Latest critic review per draft (multiple reviews if there were
  // revisions — we want the most recent verdict).
  const { data: reviews } = await admin
    .from("critic_reviews")
    .select("draft_id, overall_score, scores, verdict, feedback, created_at")
    .in("draft_id", draftIds.length > 0 ? draftIds : [""]);
  const reviewByDraft = new Map<string, ReviewRow>();
  for (const r of (reviews ?? []) as ReviewRow[]) {
    const existing = reviewByDraft.get(r.draft_id);
    if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
      reviewByDraft.set(r.draft_id, r);
    }
  }

  const { data: bankers } = await admin
    .from("bankers")
    .select("id, name, title, firm_id")
    .in("id", bankerIds.length > 0 ? bankerIds : [""]);
  const bankerById = new Map<string, BankerRow>();
  for (const b of (bankers ?? []) as BankerRow[]) bankerById.set(b.id, b);

  const firmIds = Array.from(new Set((bankers ?? []).map((b) => b.firm_id).filter(Boolean) as string[]));
  const { data: firms } = await admin
    .from("firms")
    .select("id, name")
    .in("id", firmIds.length > 0 ? firmIds : [""]);
  const firmById = new Map<string, FirmRow>();
  for (const f of (firms ?? []) as FirmRow[]) firmById.set(f.id, f);

  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (userIds.includes(u.id) && u.email) emailById.set(u.id, u.email);
  }

  const items = draftRows.map((d) => {
    const banker = d.banker_id ? bankerById.get(d.banker_id) : undefined;
    const firm = banker?.firm_id ? firmById.get(banker.firm_id) : undefined;
    const review = reviewByDraft.get(d.id);
    const bodyForEditDistance = d.pre_edit_ai_body ?? d.body;
    const finalBody = d.user_edited_body ?? d.body;
    const editPct = bodyForEditDistance && finalBody
      ? Math.round((Math.abs(finalBody.length - bodyForEditDistance.length) / Math.max(bodyForEditDistance.length, 1)) * 100)
      : null;
    return {
      id: d.id,
      userEmail: emailById.get(d.user_id) ?? null,
      type: d.type,
      status: d.status,
      iterationCount: d.iteration_count,
      banker: banker ? { name: banker.name, title: banker.title } : null,
      firm: firm ? firm.name : null,
      subject: d.subject,
      body: d.body,
      preEditAiBody: d.pre_edit_ai_body,
      userEditedBody: d.user_edited_body,
      editPct,
      skipReason: d.skip_reason,
      createdAt: d.created_at,
      critic: review
        ? {
            verdict: review.verdict,
            overallScore: review.overall_score,
            scores: review.scores,
            feedback: review.feedback,
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
