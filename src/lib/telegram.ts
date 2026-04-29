// Telegram alert sender. Used by Sentinel (cron-driven sweep) and by
// hot-path routes (e.g., /api/planner/run-now) that need to alert
// immediately on failure rather than wait for the next sentinel tick.
//
// No-ops cleanly when TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID are
// missing — same graceful-degradation pattern as our other integrations.

export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.log("[telegram] not configured — alert logged only:", message);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[telegram] send failed ${res.status}: ${body.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[telegram] send threw", err);
    return false;
  }
}
