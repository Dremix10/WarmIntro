// scripts/run-architect.ts — fire the Architect manually instead of
// waiting for the 16:00 UTC cron. Useful right after a testing session
// when you want a digest now.
//
// Usage:
//   tsx scripts/run-architect.ts                # default 24h lookback
//   tsx scripts/run-architect.ts 48             # custom lookback hours
//
// Costs ~$0.05 in Anthropic credits. Posts a digest to Telegram if
// TELEGRAM_BOT_TOKEN is set; either way logs the structured report
// via signals so /admin events panel surfaces it.
//
// Implementation note: static `import` statements hoist, so anything
// that reads process.env at module-load time (the Anthropic SDK in
// claude.ts constructs `new Anthropic()` at top level) sees undefined
// keys unless we load .env.local FIRST. We avoid the import-hoisting
// trap by loading env synchronously at the very top before any
// dynamic imports run.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvSync() {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      const value = rawValue.replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  } catch (err) {
    console.warn(".env.local read failed; relying on shell env", err);
  }
}

async function main() {
  loadEnvSync();
  // Dynamic import — runs AFTER loadEnvSync, so by the time
  // claude.ts evaluates `new Anthropic()` the API key is set.
  const { runArchitect } = await import("../src/services/agents/architect");

  const lookbackArg = process.argv[2];
  const lookbackHours = lookbackArg ? Number(lookbackArg) : 24;
  if (Number.isNaN(lookbackHours) || lookbackHours <= 0) {
    console.error("Usage: tsx scripts/run-architect.ts [lookbackHours]");
    process.exit(1);
  }
  console.log(`Running Architect with ${lookbackHours}h lookback…`);
  const result = await runArchitect({ lookbackHours });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("architect run failed", err);
  process.exit(1);
});
