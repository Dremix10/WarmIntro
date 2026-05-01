// Sentinel — monitoring agent. Watches agent errors + API credit balances; posts Telegram alerts.
// Runs every 30 min via /api/cron/sentinel. Gracefully no-ops if TELEGRAM_BOT_TOKEN is absent.
//
// Dedup: alerts are throttled by "bucket × cooldown" so a credit warning at
// "20% bucket" doesn't re-fire every 30 min while the value sits in that
// bucket — only when the bucket worsens or the cooldown expires.

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { restSelect, gte, lt, eq } from "@/lib/supabase-rest";
import { sendTelegram } from "@/lib/telegram";

export interface SentinelOutput {
  alertsSent: number;
  errors: number;
  creditWarnings: string[];
  stuckSending: number;
  gmailFailureUsers: number;
}

const HUNTER_LOW_CREDIT_PCT = 0.2; // alert when <20% remaining
const USER_DAILY_SPEND_THRESHOLD_USD = Number(process.env.ALMA_USER_SPEND_ALERT_USD ?? "5");
// Drafts wedged in 'sending' state for longer than this are early-warning
// for the dual-write hazard in outreach/sendDraft.ts. The 5-min stale-claim
// guard there will eventually recover them on the user's next click — the
// 10-min sentinel window means "something is wrong before users notice."
// If this alert fires regularly, it's the signal to ship Choice 2 (the
// reconciler cron) — see docs/refactor-plan.md D6.
const STUCK_SENDING_THRESHOLD_MIN = 10;
// Per-user threshold for repeated draft_send_failed signals in a single
// hour. Catches OAuth-token-expired loops that would otherwise be
// invisible (the helper auto-reverts the row to 'approved' so neither
// stuck-sending nor agent-errors checks notice them).
const GMAIL_FAILURE_PER_USER_HOUR = 5;
const ALERT_COOLDOWN_HOURS = {
  hunter_credit: 24,    // once a day max for credit warnings
  agent_errors: 1,      // once an hour for error bursts
  critical_signal: 1,   // once an hour for critical signals
  user_spend: 6,        // re-fire every 6h if a user keeps burning
  stuck_sending: 1,     // once an hour for wedged sends
  gmail_failures: 2,    // every 2h per affected-user bucket
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
  const out: SentinelOutput = { alertsSent: 0, errors: 0, creditWarnings: [], stuckSending: 0, gmailFailureUsers: 0 };

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

    // Check 5: drafts wedged in 'sending' for > STUCK_SENDING_THRESHOLD_MIN.
    // The CAS guard in outreach/sendDraft.ts auto-recovers stale claims at
    // 5 min — anything still 'sending' at 10 min means either nobody has
    // come back to retry OR something is genuinely stuck (Gmail-OK +
    // DB-fail dual-write hazard, repeated process death). Either way,
    // worth a Telegram ping so we can decide if the residual matters
    // enough to ship Choice 2 (the reconciler cron).
    const stuckBefore = new Date(Date.now() - STUCK_SENDING_THRESHOLD_MIN * 60 * 1000).toISOString();
    const stuckDrafts = await restSelect("drafts", {
      select: "id, user_id, banker_id, send_started_at",
      filters: {
        status: eq("sending"),
        send_started_at: lt(stuckBefore),
      },
      limit: 25,
    });
    out.stuckSending = stuckDrafts.length;

    if (stuckDrafts.length > 0) {
      const stuckBucket = stuckDrafts.length > 5 ? "lt5" : stuckDrafts.length > 2 ? "lt10" : "lt20";
      if (await shouldAlert("stuck_sending", stuckBucket)) {
        const sample = stuckDrafts
          .slice(0, 5)
          .map((d) => `${(d.id as string).slice(0, 8)}… (user ${(d.user_id as string).slice(0, 8)}…, started ${d.send_started_at})`)
          .join("\n");
        const sent = (await sendTelegram(
          `🟠 Drafts wedged in 'sending' > ${STUCK_SENDING_THRESHOLD_MIN} min\n\n${stuckDrafts.length} stuck draft(s):\n${sample}\n\nIf this fires regularly, ship the reconciler cron (Choice 2 in D6).`
        )).sent;
        if (sent) {
          out.alertsSent++;
          await recordAlert("stuck_sending", stuckBucket, { count: stuckDrafts.length });
        }
      }
    }

    // Check 6: per-user gmail_send_failed bursts. If a user's OAuth
    // token expired or their Gmail is otherwise broken, every send
    // produces a draft_send_failed signal and the helper reverts the
    // row to 'approved'. Neither stuck-sending nor agent-errors
    // catches this because the row never wedges and no agent crashes.
    const failureSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const failureSignals = await restSelect("signals", {
      select: "user_id",
      filters: {
        signal_type: eq("draft_send_failed"),
        occurred_at: gte(failureSince),
      },
      limit: 500,
    });
    const failuresByUser: Record<string, number> = {};
    for (const s of failureSignals) {
      const uid = s.user_id as string | null;
      if (!uid) continue;
      failuresByUser[uid] = (failuresByUser[uid] ?? 0) + 1;
    }
    const affectedUsers = Object.entries(failuresByUser).filter(([, n]) => n >= GMAIL_FAILURE_PER_USER_HOUR);
    out.gmailFailureUsers = affectedUsers.length;

    if (affectedUsers.length > 0) {
      const failBucket = affectedUsers.length > 3 ? "lt5" : "lt10";
      if (await shouldAlert("gmail_failures", failBucket)) {
        const top = affectedUsers
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([uid, count]) => `${uid.slice(0, 8)}…: ${count} fails`)
          .join("\n");
        const sent = (await sendTelegram(
          `🔶 Gmail send failures · last 1h (≥${GMAIL_FAILURE_PER_USER_HOUR}/user)\n\n${affectedUsers.length} user(s) affected:\n${top}\n\nLikely cause: expired OAuth token. Check /admin.`
        )).sent;
        if (sent) {
          out.alertsSent++;
          await recordAlert("gmail_failures", failBucket, { count: affectedUsers.length });
        }
      }
    }

    await logSignal({
      agent: "curator",
      signalType: "sentinel_run",
      metadata: {
        alertsSent: out.alertsSent,
        errors: out.errors,
        hunterAvailable: hunter?.available,
        hunterTotal: hunter?.total,
        overBudgetUsers: overBudget.length,
        stuckSending: out.stuckSending,
        gmailFailureUsers: out.gmailFailureUsers,
      },
    });
    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}
