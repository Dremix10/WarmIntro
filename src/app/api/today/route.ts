// GET /api/today — returns drafts + trust level + recent activity for the authenticated user

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Phase 1: five reads keyed on user_id, all independent. Run in parallel —
  // saves ~150-300ms vs the sequential await chain this used to be.
  const [
    { data: drafts },
    { data: trust },
    { data: recent },
    { data: pipeline },
    { data: profile },
  ] = await Promise.all([
    ctx.supabase
      .from("drafts")
      .select("id, banker_id, type, subject, body, status, iteration_count, scheduled_send_at, created_at, fact_check, critic_override, bankers(name, title, email, linkedin_url, firm_id, firms(name))")
      .eq("user_id", ctx.user.id)
      .in("status", ["pending_critic", "needs_revision", "approved", "rejected_unresolvable"])
      .is("sent_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    ctx.supabase
      .from("trust_levels")
      .select("*")
      .eq("user_id", ctx.user.id)
      .maybeSingle(),
    ctx.supabase
      .from("signals")
      .select("signal_type, metadata, occurred_at")
      .eq("user_id", ctx.user.id)
      .order("occurred_at", { ascending: false })
      .limit(15),
    ctx.supabase
      .from("connections")
      .select("stage")
      .eq("user_id", ctx.user.id),
    ctx.supabase
      .from("profiles")
      .select("target_firms, gmail_connected_at")
      .eq("id", ctx.user.id)
      .maybeSingle(),
  ]);

  // Phase 2: hydrate drafts with their latest critic_review + iteration
  // history so the override modal can show the user exactly what the Critic
  // objected to. Depends on the draft IDs from phase 1, but the two reads
  // here are themselves independent — kept in their own Promise.all.
  const draftIds = (drafts ?? []).map((d) => d.id);
  const latestReviewByDraft: Record<string, { verdict: string; feedback: string | null; overall_score: number; created_at: string } | undefined> = {};
  const iterationsByDraft: Record<string, Array<{ iteration: number; subject: string | null; body: string; critic_verdict: string | null; critic_feedback: string | null; critic_score: number | null; created_at: string }>> = {};
  if (draftIds.length > 0) {
    const [reviewsRes, iterRes] = await Promise.all([
      ctx.supabase
        .from("critic_reviews")
        .select("draft_id, verdict, feedback, overall_score, created_at")
        .in("draft_id", draftIds)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("draft_iterations")
        .select("draft_id, iteration, subject, body, critic_verdict, critic_feedback, critic_score, created_at")
        .in("draft_id", draftIds)
        .order("iteration", { ascending: true }),
    ]);
    for (const r of reviewsRes.data ?? []) {
      if (!latestReviewByDraft[r.draft_id]) {
        latestReviewByDraft[r.draft_id] = {
          verdict: r.verdict,
          feedback: r.feedback,
          overall_score: r.overall_score,
          created_at: r.created_at,
        };
      }
    }
    for (const it of iterRes.data ?? []) {
      if (!iterationsByDraft[it.draft_id]) iterationsByDraft[it.draft_id] = [];
      iterationsByDraft[it.draft_id].push({
        iteration: it.iteration,
        subject: it.subject,
        body: it.body,
        critic_verdict: it.critic_verdict,
        critic_feedback: it.critic_feedback,
        critic_score: it.critic_score === null ? null : Number(it.critic_score),
        created_at: it.created_at,
      });
    }
  }
  const draftsWithReview = (drafts ?? []).map((d) => ({
    ...d,
    latest_review: latestReviewByDraft[d.id] ?? null,
    iterations: iterationsByDraft[d.id] ?? [],
  }));

  const stageCounts: Record<string, number> = {};
  for (const c of pipeline ?? []) stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1;

  const needsSetup = !profile?.target_firms || profile.target_firms.length === 0;
  const needsGmail = !profile?.gmail_connected_at;

  return NextResponse.json(
    {
      drafts: draftsWithReview,
      trust: trust ?? null,
      recent: recent ?? [],
      stageCounts,
      needsSetup,
      needsGmail,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, stale-while-revalidate=300",
      },
    },
  );
}
