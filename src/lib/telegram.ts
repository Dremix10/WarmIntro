// Telegram alert sender. Used by Sentinel (cron-driven sweep) and by
// hot-path routes (e.g., /api/planner/run-now) that need to alert
// immediately on failure rather than wait for the next sentinel tick.
//
// No-ops cleanly when TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID are
// missing — same graceful-degradation pattern as our other integrations.

export interface TelegramResult {
  sent: boolean;
  reason?: string;
}

// Internal: the actual API call. parse_mode is opt-in via opts because
// Markdown parser is finicky (unbalanced * / _ / backticks blow up the
// whole message), so callers that include freeform content (JSON, error
// stacks, user emails) should usually skip Markdown.
export async function sendTelegram(
  message: string,
  opts: { markdown?: boolean } = {}
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.log("[telegram] not configured — alert logged only:", message);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text: message };
    if (opts.markdown) body.parse_mode = "Markdown";
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const respBody = await res.text().catch(() => "");
      console.warn(`[telegram] send failed ${res.status}: ${respBody.slice(0, 200)}`);
      return { sent: false, reason: `http_${res.status}: ${respBody.slice(0, 120)}` };
    }
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[telegram] send threw", msg);
    return { sent: false, reason: `threw: ${msg.slice(0, 120)}` };
  }
}
