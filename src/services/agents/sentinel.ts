// Sentinel — monitoring agent. Watches agent errors + API credit balances; posts Telegram alerts.
// Runs every 30 min via /api/cron/sentinel. Gracefully no-ops if TELEGRAM_BOT_TOKEN is absent.
//
// Dedup: alerts are throttled by "bucket × cooldown" so a credit warning at
// "20% bucket" doesn't re-fire every 30 min while the value sits in that
// bucket — only when the bucket worsens or the cooldown expires.

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { restSelect, gte, eq } from "@/lib/supabase-rest";
import { sendTelegram } from "@/lib/telegram";

export interface SentinelOutput {
  alertsSent: number;
  errors: number;
  creditWarnings: string[];
}

const HUNTER_LOW_CREDIT_PCT = 0.2; // alert when <20% remaining
const USER_DAILY_SPEND_THRESHOLD_USD = Number(process.env.ALMA_USER_SPEND_ALERT_USD ?? "5");
const ALERT_COOLDOWN_HOURS = {
  hunter_credit: 24,    // once a day max for credit warnings
  agent_errors: 1,      // once an hour for error bursts
  critical_signal: 1,   // once an hour for critical signals
  user_spend: 6,        // re-fire every 6h if a user keeps burning
} as const;

type AlertKey = keyof typeof ALERT_COOLDOWN_HOURS;

function bucketForPct(pct: number): string {
  // Coarse buckets so we re-fire when things visibly worsen, not on noise.
  if (pct <= 0.05) return "lt5";
  if (pct <= 0.10) return "lt10";
  if (pct <= 0.20) return "lt20";
  if (pct <= 0.50) return "lt50";
  return "ok";
}

interface AlertSignalMeta { bucket?: string }

async function shouldAlert(key: AlertKey, currentBucket: string): Promise<boolean> {
  const cooldownMs = ALERT_COOLDOWN_HOURS[key] * 60 * 60 * 1000;
  const since = new Date(Date.now() - cooldownMs).toISOString();
  const recent = await restSelect("signals", {
    select: "metadata, occurred_at",
    filters: {
      signal_type: eq(`alert_${key}`),
      occurred_at: gte(since),
    },
    limit: 5,
  });
  if (recent.length === 0) return true; // first alert in cooldown window
  // If any recent alert was for a *less severe* bucket, the situation has
  // gotten worse — fire again. Otherwise stay quiet.
  const buckets = recent.map((r) => (r.metadata as AlertSignalMeta | null)?.bucket).filter(Boolean) as string[];
  const severityOrder = ["ok", "lt50", "lt20", "lt10", "lt5"];
  const currentSeverity = severityOrder.indexOf(currentBucket);
  const maxRecentSeverity = Math.max(...buckets.map((b) => severityOrder.indexOf(b)), -1);
  return currentSeverity > maxRecentSeverity;
}

async function recordAlert(key: AlertKey, bucket: string, payload: Record<string, unknown>): Promise<void> {
  await logSignal({
    agent: "curator",
    signalType: `alert_${key}`,
    metadata: { bucket, ...payload },
  });
}

interface HunterAccountResponse {
  data?: {
    requests?: {
      searches?: { available: number; used: number };
      verifications?: { available: number; used: number };
    };
  };
}

async function getHunterBalance(): Promise<{ available: number; total: number } | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`);
    if (!res.ok) return null;
    const json = (await res.json()) as HunterAccountResponse;
    const searches = json.data?.requests?.searches;
    if (!searches) return null;
    return { available: searches.available - searches.used, total: searches.available };
  } catch {
    return null;
  }
}

export async function runSentinel(): Promise<SentinelOutput> {
  const ctx = await startAgentRun({ agent: "curator", triggeredBy: "cron", inputSummary: { mode: "sentinel" } });
  const out: SentinelOutput = { alertsSent: 0, errors: 0, creditWarnings: [] };

  try {
    // Check 1: agent errors in last 30 min
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const errorRuns = await restSelect("agent_runs", {
      select: "agent, error, started_at",
      filters: { error: "not.is.null", started_at: gte(since) },
      limit: 10,
    });

    if (errorRuns.length > 0) {
      out.errors = errorRuns.length;
      const errorsBy: Record<string, number> = {};
      for (const r of errorRuns) errorsBy[r.agent] = (errorsBy[r.agent] ?? 0) + 1;
      // Burst severity: lt5 = >10 errors, lt10 = 5-10, lt20 = 1-4
      const total = errorRuns.length;
      const errorBucket = total > 10 ? "lt5" : total > 4 ? "lt10" : "lt20";
      if (await shouldAlert("agent_errors", errorBucket)) {
        const summary = Object.entries(errorsBy).map(([a, n]) => `${a}: ${n}`).join(", ");
        const sent = (await sendTelegram(`🔴 Alma alerts · last 30 min\n\nAgent errors: ${summary}\n\nFirst error: ${String(errorRuns[0].error).slice(0, 200)}`)).sent;
        if (sent) {
          out.alertsSent++;
          await recordAlert("agent_errors", errorBucket, { total, errorsBy });
        }
      }
    }

    // Check 2: Hunter credit balance
    const hunter = await getHunterBalance();
    if (hunter) {
      const pctRemaining = hunter.total > 0 ? hunter.available / hunter.total : 1;
      if (pctRemaining < HUNTER_LOW_CREDIT_PCT) {
        const bucket = bucketForPct(pctRemaining);
        out.creditWarnings.push(`Hunter: ${hunter.available}/${hunter.total} credits (${Math.round(pctRemaining * 100)}% left)`);
        if (await shouldAlert("hunter_credit", bucket)) {
          const sent = (await sendTelegram(`💰 Hunter.io credit warning\n\n${hunter.available} of ${hunter.total} credits left (${Math.round(pctRemaining * 100)}%).\n\nTime to top up: https://hunter.io/pricing`)).sent;
          if (sent) {
            out.alertsSent++;
            await recordAlert("hunter_credit", bucket, { available: hunter.available, total: hunter.total });
          }
        }
      }
    }

    // Check 3: any signals flagged as critical in last 30 min. Includes
    // planner_run_failed and planner_run_slow because Run Alma being broken
    // (or so slow the user thinks it is) is the worst customer UX failure
    // we can have. The run-now route also fires its own immediate Telegram
    // — this sweep is the redundant safety net + per-bucket dedup.
    const criticalSignals = await restSelect("signals", {
      select: "signal_type, metadata, occurred_at",
      filters: {
        signal_type: `in.("critic_rejected_unresolvable_escalated","planner_crash","planner_run_failed","planner_run_slow","gmail_oauth_expired")`,
        occurred_at: gte(since),
      },
      limit: 10,
    });

    if (criticalSignals.length > 0) {
      const bucket = criticalSignals.length > 5 ? "lt5" : criticalSignals.length > 2 ? "lt10" : "lt20";
      if (await shouldAlert("critical_signal", bucket)) {
        const breakdown: Record<string, number> = {};
        for (const s of criticalSignals) breakdown[s.signal_type as string] = (breakdown[s.signal_type as string] ?? 0) + 1;
        const summary = Object.entries(breakdown).map(([k, n]) => `${k}: ${n}`).join(", ");
        const sent = (await sendTelegram(`⚠️ Alma critical signals · last 30 min\n\n${summary}\n\nCheck /agents.`)).sent;
        if (sent) {
          out.alertsSent++;
          await recordAlert("critical_signal", bucket, { count: criticalSignals.length, breakdown });
        }
      }
    }

    // Check 4: per-user Anthropic spend in last 24h. Alert if any user
    // crosses ALMA_USER_SPEND_ALERT_USD (default $5) — protects us from a
    // user accidentally (or maliciously) burning credits in a loop.
    const usageRows = await restSelect("claude_usage", {
      select: "user_id, cost_usd, occurred_at",
      filters: { occurred_at: gte(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) },
      limit: 5000,
    });
    const spendByUser: Record<string, number> = {};
    for (const r of usageRows) {
      const uid = r.user_id as string | null;
      if (!uid) continue;
      spendByUser[uid] = (spendByUser[uid] ?? 0) + Number(r.cost_usd ?? 0);
    }
    const overBudget = Object.entries(spendByUser).filter(([, v]) => v >= USER_DAILY_SPEND_THRESHOLD_USD);
    if (overBudget.length > 0) {
      const bucket = overBudget.length > 3 ? "lt5" : "lt10";
      if (await shouldAlert("user_spend", bucket)) {
        const topLines = overBudget
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([uid, cost]) => `${uid.slice(0, 8)}…: $${cost.toFixed(2)}`)
          .join("\n");
        const sent = (await sendTelegram(
          `💸 User spend alert · last 24h (threshold $${USER_DAILY_SPEND_THRESHOLD_USD})\n\n${overBudget.length} user(s) over:\n${topLines}\n\nCheck /admin.`
        )).sent;
        if (sent) {
          out.alertsSent++;
          await recordAlert("user_spend", bucket, { count: overBudget.length, threshold: USER_DAILY_SPEND_THRESHOLD_USD });
        }
      }
    }

    await logSignal({
      agent: "curator",
      signalType: "sentinel_run",
      metadata: { alertsSent: out.alertsSent, errors: out.errors, hunterAvailable: hunter?.available, hunterTotal: hunter?.total, overBudgetUsers: overBudget.length },
    });
    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}
