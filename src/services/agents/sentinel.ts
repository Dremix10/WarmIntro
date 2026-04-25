// Sentinel — monitoring agent. Watches agent errors + API credit balances; posts Telegram alerts.
// Runs every 30 min via /api/cron/sentinel. Gracefully no-ops if TELEGRAM_BOT_TOKEN is absent.

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { restSelect, gte } from "@/lib/supabase-rest";

export interface SentinelOutput {
  alertsSent: number;
  errors: number;
  creditWarnings: string[];
}

const HUNTER_LOW_CREDIT_PCT = 0.2; // alert when <20% remaining

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

async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) {
    console.log("[sentinel] Telegram not configured — alert logged only:", message);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[sentinel] Telegram send failed", err);
    return false;
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
      const summary = Object.entries(errorsBy).map(([a, n]) => `${a}: ${n}`).join(", ");
      const sent = await sendTelegram(`🔴 *Alma alerts* · last 30 min\n\nAgent errors: ${summary}\n\nFirst error: \`${String(errorRuns[0].error).slice(0, 200)}\``);
      if (sent) out.alertsSent++;
    }

    // Check 2: Hunter credit balance
    const hunter = await getHunterBalance();
    if (hunter) {
      const pctRemaining = hunter.total > 0 ? hunter.available / hunter.total : 1;
      if (pctRemaining < HUNTER_LOW_CREDIT_PCT) {
        out.creditWarnings.push(`Hunter: ${hunter.available}/${hunter.total} credits (${Math.round(pctRemaining * 100)}% left)`);
        const sent = await sendTelegram(`💰 *Hunter.io credit warning*\n\n${hunter.available} of ${hunter.total} credits left (${Math.round(pctRemaining * 100)}%).\n\nTime to top up: https://hunter.io/pricing`);
        if (sent) out.alertsSent++;
      }
    }

    // Check 3: any signals flagged as critical in last 30 min
    const criticalSignals = await restSelect("signals", {
      select: "signal_type, metadata, occurred_at",
      filters: {
        signal_type: `in.("critic_rejected_unresolvable_escalated","planner_crash","gmail_oauth_expired")`,
        occurred_at: gte(since),
      },
      limit: 10,
    });

    if (criticalSignals.length > 0) {
      const sent = await sendTelegram(`⚠️ *Alma critical signals*\n\n${criticalSignals.length} critical events in last 30 min. Check /agents.`);
      if (sent) out.alertsSent++;
    }

    await logSignal({
      agent: "curator",
      signalType: "sentinel_run",
      metadata: { alertsSent: out.alertsSent, errors: out.errors, hunterAvailable: hunter?.available, hunterTotal: hunter?.total },
    });
    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}
