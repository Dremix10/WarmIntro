import { NextResponse } from "next/server";
import type {
  UpdateFunnelRequest,
  UpdateFunnelResponse,
  FunnelState,
  GameState,
  Badge,
} from "@/shared/types";
import { FUNNEL_STAGES, LEVELS, XP_VALUES, BADGES } from "@/shared/constants";

const funnelState: FunnelState = {
  stages: FUNNEL_STAGES.map((s, i) => ({
    id: `stage-${i + 1}`,
    name: s.name,
    targetCount: s.targetMultiplier,
    currentCount: 0,
    conversionRate: s.conversionRate,
    color: s.color,
    icon: s.icon,
  })),
  totalOutreachNeeded: 100,
  totalOutreachDone: 0,
  estimatedOffers: 1,
  weekNumber: 1,
};

const gameState: GameState = {
  xp: 0,
  level: 1,
  levelName: LEVELS[0].name,
  streak: 0,
  badges: BADGES.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    earned: false,
  })),
  recentActions: [],
};

// Track sent alumni to prevent double-counting
const sentAlumniIds = new Set<string>();

function updateLevel(state: GameState): void {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (state.xp >= LEVELS[i].minXP) {
      state.level = LEVELS[i].level;
      state.levelName = LEVELS[i].name;
      break;
    }
  }
}

function checkBadges(state: GameState, funnel: FunnelState): Badge[] {
  const newBadges: Badge[] = [];
  const now = new Date().toISOString();

  const checks: { id: string; condition: boolean }[] = [
    {
      id: "first_outreach",
      condition: funnel.stages[0].currentCount >= 1,
    },
    {
      id: "ten_sent",
      condition: funnel.stages[0].currentCount >= 10,
    },
    {
      id: "first_reply",
      condition: funnel.stages[1].currentCount >= 1,
    },
    {
      id: "five_coffees",
      condition: funnel.stages[1].currentCount >= 5,
    },
    {
      id: "first_referral",
      condition: funnel.stages[2].currentCount >= 1,
    },
    {
      id: "streak_7",
      condition: state.streak >= 7,
    },
    {
      id: "offer_secured",
      condition: funnel.stages[4].currentCount >= 1,
    },
  ];

  for (const check of checks) {
    const badge = state.badges.find((b) => b.id === check.id);
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
    const body = (await request.json()) as UpdateFunnelRequest;

    if (!body.action || !body.companyId) {
      return NextResponse.json(
        { error: "action and companyId are required" },
        { status: 400 }
      );
    }

    // Dedup: if this alumni was already marked sent, return current state without double-counting
    if (body.action === "outreach_sent" && body.alumniId && sentAlumniIds.has(body.alumniId)) {
      const response: UpdateFunnelResponse = {
        funnel: { ...funnelState },
        gameState: { ...gameState },
        xpGained: 0,
        newBadges: [],
      };
      return NextResponse.json(response);
    }

    if (body.action === "outreach_sent" && body.alumniId) {
      sentAlumniIds.add(body.alumniId);
    }

    const xpGained = XP_VALUES[body.action];

    switch (body.action) {
      case "outreach_sent":
        funnelState.stages[0].currentCount += 1;
        funnelState.totalOutreachDone += 1;
        gameState.streak += 1;
        break;
      case "reply_received":
        // XP only — reply is a signal, not a funnel stage
        break;
      case "coffee_booked":
        funnelState.stages[1].currentCount += 1;
        break;
      case "referral_earned":
        funnelState.stages[2].currentCount += 1;
        break;
    }

    gameState.xp += xpGained;
    updateLevel(gameState);

    gameState.recentActions.unshift({
      type: body.action,
      xpGained,
      description: `${body.action.replace(/_/g, " ")} for ${body.companyId}`,
      timestamp: new Date().toISOString(),
    });

    if (gameState.recentActions.length > 20) {
      gameState.recentActions = gameState.recentActions.slice(0, 20);
    }

    const newBadges = checkBadges(gameState, funnelState);

    const response: UpdateFunnelResponse = {
      funnel: { ...funnelState },
      gameState: { ...gameState },
      xpGained,
      newBadges,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update funnel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
