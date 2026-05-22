import { NextResponse } from "next/server";
import type {
  UpdateFunnelRequest,
  UpdateFunnelResponse,
  FunnelState,
  GameState,
  Badge,
} from "@/shared/types";
import { FUNNEL_STAGES, LEVELS, XP_VALUES, BADGES } from "@/shared/constants";
import { getUser } from "@/lib/auth";

const VALID_ACTIONS = ["outreach_sent", "reply_received", "coffee_booked", "referral_earned"] as const;

function createInitialStages() {
  return FUNNEL_STAGES.map((s, i) => ({
    id: `stage-${i + 1}`,
    name: s.name,
    targetCount: s.targetMultiplier,
    currentCount: 0,
    conversionRate: s.conversionRate,
    color: s.color,
    icon: s.icon,
  }));
}

function createInitialBadges() {
  return BADGES.map((b) => ({ id: b.id, name: b.name, icon: b.icon, earned: false }));
}

function updateLevel(xp: number): { level: number; levelName: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return { level: LEVELS[i].level, levelName: LEVELS[i].name };
  }
  return { level: 1, levelName: LEVELS[0].name };
}

function checkBadges(badges: Badge[], stages: FunnelState["stages"], streak: number): Badge[] {
  const newBadges: Badge[] = [];
  const now = new Date().toISOString();
  const checks = [
    { id: "first_outreach", condition: stages[0].currentCount >= 1 },
    { id: "ten_sent", condition: stages[0].currentCount >= 10 },
    { id: "first_reply", condition: stages[1].currentCount >= 1 },
    { id: "five_coffees", condition: stages[1].currentCount >= 5 },
    { id: "first_referral", condition: stages[2].currentCount >= 1 },
    { id: "streak_7", condition: streak >= 7 },
    { id: "offer_secured", condition: stages[4].currentCount >= 1 },
  ];
  for (const check of checks) {
    const badge = badges.find((b) => b.id === check.id);
    if (badge && !badge.earned && check.condition) {
      badge.earned = true;
      badge.earnedAt = now;
      newBadges.push({ ...badge });
    }
  }
  return newBadges;
}

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateFunnelRequest;

    if (!body.action || !body.companyId || typeof body.action !== "string" || typeof body.companyId !== "string") {
      return NextResponse.json({ error: "action and companyId are required" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(body.action as typeof VALID_ACTIONS[number])) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { supabase, user } = auth;

    const { data: existing } = await supabase
      .from("funnel_states").select("*").eq("user_id", user.id).single();

    const stages = (existing?.stages as FunnelState["stages"] | null) ?? createInitialStages();
    const badges = (existing?.badges as Badge[] | null) ?? createInitialBadges();
    let xp = existing?.xp ?? 0;
    let streak = existing?.streak ?? 0;
    let totalOutreachDone = existing?.total_outreach_done ?? 0;
    const recentActions = (existing?.recent_actions as GameState["recentActions"] | null) ?? [];

    // Dedup outreach via connections table
    if (body.action === "outreach_sent" && body.alumniId) {
      const { data: existingConn } = await supabase
        .from("connections").select("id").eq("user_id", user.id).eq("alumni_id", body.alumniId).single();
      if (existingConn) {
        return NextResponse.json(buildResponse(stages, xp, streak, badges, recentActions, totalOutreachDone, 0, []));
      }
    }

    const xpGained = XP_VALUES[body.action];

    switch (body.action) {
      case "outreach_sent":
        stages[0].currentCount += 1;
        totalOutreachDone += 1;
        streak += 1;
        break;
      case "reply_received":
        break;
      case "coffee_booked":
        stages[1].currentCount += 1;
        break;
      case "referral_earned":
        stages[2].currentCount += 1;
        break;
    }

    xp += xpGained;
    const { level, levelName } = updateLevel(xp);

    recentActions.unshift({
      type: body.action, xpGained,
      description: `${body.action.replace(/_/g, " ")} for ${body.companyId}`,
      timestamp: new Date().toISOString(),
    });
    if (recentActions.length > 20) recentActions.splice(20);

    const newBadges = checkBadges(badges, stages, streak);

    await supabase.from("funnel_states").upsert({
      user_id: user.id, xp, level, level_name: levelName, streak,
      badges: JSON.parse(JSON.stringify(badges)),
      recent_actions: JSON.parse(JSON.stringify(recentActions)),
      stages: JSON.parse(JSON.stringify(stages)),
      total_outreach_done: totalOutreachDone,
    });

    return NextResponse.json(buildResponse(stages, xp, streak, badges, recentActions, totalOutreachDone, xpGained, newBadges, level, levelName));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update funnel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildResponse(
  stages: FunnelState["stages"], xp: number, streak: number, badges: Badge[],
  recentActions: GameState["recentActions"], totalOutreachDone: number,
  xpGained: number, newBadges: Badge[], level?: number, levelName?: string,
): UpdateFunnelResponse {
  const resolved = level !== undefined ? { level, levelName: levelName! } : updateLevel(xp);
  return {
    funnel: { stages: stages.map((s) => ({ ...s })), totalOutreachNeeded: 100, totalOutreachDone, estimatedOffers: 1, weekNumber: 1 },
    gameState: { xp, level: resolved.level, levelName: resolved.levelName, streak, badges: badges.map((b) => ({ ...b })), recentActions: [...recentActions] },
    xpGained, newBadges,
  };
}
