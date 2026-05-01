// Weekly aggregation: reads signals → computes scoring weights + critic calibration → publishes flywheel release
// Runs Sunday 11 PM UTC via /api/cron/weekly-flywheel

import { getAdminClient } from "@/lib/supabase-admin";
import type { Json } from "@/lib/database.types";

interface BucketStat {
  scoreBucket: "0-4" | "5-6" | "7-8" | "9-10";
  replyRate: number;
  coffeeRate: number;
  referralRate: number;
  sampleSize: number;
}

function bucketForScore(score: number): BucketStat["scoreBucket"] {
  if (score < 5) return "0-4";
  if (score < 7) return "5-6";
  if (score < 9) return "7-8";
  return "9-10";
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 2 || xs.length !== ys.length) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

export interface FlywheelRunResult {
  scoringWeightsVersion: number;
  criticCalibrationVersion: number;
  release: {
    weekOf: string;
    headline: string;
    changes: Record<string, unknown>;
  };
}

export async function runWeeklyFlywheel(): Promise<FlywheelRunResult> {
  const admin = getAdminClient();

  // Window: past 7 days
  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Pull all signals and drafts/critic reviews from the window
  const [{ data: signals = [] }, { data: critics = [] }, { data: drafts = [] }] = await Promise.all([
    admin.from("signals").select("*").gte("occurred_at", weekStart.toISOString()),
    admin.from("critic_reviews").select("*"),
    admin.from("drafts").select("id, banker_id, status, created_at"),
  ]);

  // 1. Banker response rates
  const bankerSendCount: Record<string, number> = {};
  const bankerReplyCount: Record<string, number> = {};
  for (const s of signals ?? []) {
    if (!s.banker_id) continue;
    if (s.signal_type === "draft_sent") bankerSendCount[s.banker_id] = (bankerSendCount[s.banker_id] ?? 0) + 1;
    if (s.signal_type === "reply_received") bankerReplyCount[s.banker_id] = (bankerReplyCount[s.banker_id] ?? 0) + 1;
  }
  const bankerResponseRate: Record<string, number> = {};
  for (const id of Object.keys(bankerSendCount)) {
    bankerResponseRate[id] = (bankerReplyCount[id] ?? 0) / bankerSendCount[id];
  }

  // 2. Opener conversion (signals tagged with opener_template_id)
  const openerSent: Record<string, number> = {};
  const openerReplied: Record<string, number> = {};
  for (const s of signals ?? []) {
    const tpl = (s.metadata as Record<string, unknown> | null)?.opener_template_id;
    if (typeof tpl !== "string") continue;
    if (s.signal_type === "draft_sent") openerSent[tpl] = (openerSent[tpl] ?? 0) + 1;
    if (s.signal_type === "reply_received") openerReplied[tpl] = (openerReplied[tpl] ?? 0) + 1;
  }
  const openerConversion: Record<string, number> = {};
  for (const id of Object.keys(openerSent)) {
    openerConversion[id] = (openerReplied[id] ?? 0) / openerSent[id];
  }

  // 3. Group activity tier (group_id → reply rate, normalized)
  const groupSend: Record<string, number> = {};
  const groupReply: Record<string, number> = {};
  for (const s of signals ?? []) {
    const groupId = (s.metadata as Record<string, unknown> | null)?.group_id;
    if (typeof groupId !== "string") continue;
    if (s.signal_type === "draft_sent") groupSend[groupId] = (groupSend[groupId] ?? 0) + 1;
    if (s.signal_type === "reply_received") groupReply[groupId] = (groupReply[groupId] ?? 0) + 1;
  }
  const groupActivityTier: Record<string, number> = {};
  for (const id of Object.keys(groupSend)) {
    groupActivityTier[id] = (groupReply[id] ?? 0) / groupSend[id];
  }

  // 4. Bump scoring_weights version and mark active
  const { data: lastWeight } = await admin
    .from("scoring_weights")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextWeightVersion = (lastWeight?.version ?? 0) + 1;

  await admin.from("scoring_weights").update({ is_active: false }).eq("is_active", true);
  await admin.from("scoring_weights").insert({
    version: nextWeightVersion,
    weights: {
      bankerResponseRate,
      openerConversion,
      groupActivityTier,
    } as unknown as Json,
    is_active: true,
  });

  // 5. Critic calibration: score buckets vs reply/coffee/referral rates
  type DraftOutcome = { draftId: string; score: number; axes: { specificity: number; voiceMatch: number; guardrails: number; sharedGround: number }; replied: boolean; coffee: boolean; referral: boolean };
  const draftMap = new Map<string, DraftOutcome>();
  for (const c of critics ?? []) {
    if (!c.draft_id) continue;
    const scores = (c.scores as unknown as { specificity?: number; voice_match?: number; voiceMatch?: number; guardrails?: number; shared_ground?: number; sharedGround?: number }) ?? {};
    draftMap.set(c.draft_id, {
      draftId: c.draft_id,
      score: Number(c.overall_score ?? 0),
      axes: {
        specificity: Number(scores.specificity ?? 0),
        voiceMatch: Number(scores.voice_match ?? scores.voiceMatch ?? 0),
        guardrails: Number(scores.guardrails ?? 0),
        sharedGround: Number(scores.shared_ground ?? scores.sharedGround ?? 0),
      },
      replied: false,
      coffee: false,
      referral: false,
    });
  }

  for (const s of signals ?? []) {
    if (!s.draft_id) continue;
    const o = draftMap.get(s.draft_id);
    if (!o) continue;
    if (s.signal_type === "reply_received") o.replied = true;
    if (s.signal_type === "coffee_booked") o.coffee = true;
    if (s.signal_type === "referral_given") o.referral = true;
  }

  const outcomes = Array.from(draftMap.values());

  const buckets: Record<BucketStat["scoreBucket"], { n: number; replies: number; coffees: number; referrals: number }> = {
    "0-4": { n: 0, replies: 0, coffees: 0, referrals: 0 },
    "5-6": { n: 0, replies: 0, coffees: 0, referrals: 0 },
    "7-8": { n: 0, replies: 0, coffees: 0, referrals: 0 },
    "9-10": { n: 0, replies: 0, coffees: 0, referrals: 0 },
  };
  for (const o of outcomes) {
    const b = buckets[bucketForScore(o.score)];
    b.n += 1;
    if (o.replied) b.replies += 1;
    if (o.coffee) b.coffees += 1;
    if (o.referral) b.referrals += 1;
  }

  const bucketStats: BucketStat[] = (Object.keys(buckets) as BucketStat["scoreBucket"][]).map((k) => ({
    scoreBucket: k,
    sampleSize: buckets[k].n,
    replyRate: buckets[k].n ? buckets[k].replies / buckets[k].n : 0,
    coffeeRate: buckets[k].n ? buckets[k].coffees / buckets[k].n : 0,
    referralRate: buckets[k].n ? buckets[k].referrals / buckets[k].n : 0,
  }));

  const replied01 = outcomes.map((o) => (o.replied ? 1 : 0));
  const axisCorrelations = {
    specificity: pearson(outcomes.map((o) => o.axes.specificity), replied01),
    voiceMatch: pearson(outcomes.map((o) => o.axes.voiceMatch), replied01),
    guardrails: pearson(outcomes.map((o) => o.axes.guardrails), replied01),
    sharedGround: pearson(outcomes.map((o) => o.axes.sharedGround), replied01),
  };

  const { data: lastCalib } = await admin
    .from("critic_calibration")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextCalibVersion = (lastCalib?.version ?? 0) + 1;

  await admin.from("critic_calibration").insert({
    version: nextCalibVersion,
    bucket_stats: bucketStats as unknown as Json,
    axis_correlations: axisCorrelations as unknown as Json,
    notes: `Auto-computed from ${outcomes.length} reviewed drafts, ${(signals ?? []).length} signals.`,
  });

  // 6. Publish flywheel release
  const topBanker = Object.entries(bankerResponseRate).sort((a, b) => b[1] - a[1])[0];
  const headline = topBanker
    ? `Week of ${weekStart.toISOString().slice(0, 10)}: banker ${topBanker[0]} leads with ${Math.round(topBanker[1] * 100)}% reply rate; ${outcomes.length} drafts graded by Critic.`
    : `Week of ${weekStart.toISOString().slice(0, 10)}: flywheel initialized with ${outcomes.length} drafts graded.`;

  const changes = {
    topBankers: Object.entries(bankerResponseRate).sort((a, b) => b[1] - a[1]).slice(0, 5),
    bucketStats,
    axisCorrelations,
    signalVolume: (signals ?? []).length,
    draftsGraded: outcomes.length,
  };

  await admin.from("flywheel_releases").insert({
    week_of: weekStart.toISOString().slice(0, 10),
    headline,
    changes: changes as unknown as Json,
    scoring_weights_version: nextWeightVersion,
    critic_calibration_version: nextCalibVersion,
  });

  return {
    scoringWeightsVersion: nextWeightVersion,
    criticCalibrationVersion: nextCalibVersion,
    release: { weekOf: weekStart.toISOString().slice(0, 10), headline, changes },
  };
}

export async function getActiveScoringWeights(): Promise<Record<string, unknown> | null> {
  try {
    const admin = getAdminClient();
    const { data } = await admin.from("scoring_weights").select("weights").eq("is_active", true).maybeSingle();
    return (data?.weights as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}
