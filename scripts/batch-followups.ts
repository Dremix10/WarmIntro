// scripts/batch-followups.ts — one-shot launch/demo follow-up batch.
//
// Usage:
//   npx tsx scripts/batch-followups.ts --dry-run
//   npx tsx scripts/batch-followups.ts --queue
//   npx tsx scripts/batch-followups.ts --send --yes

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
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch (err) {
    console.warn(".env.local read failed; relying on shell env", err);
  }
}

function argValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = process.argv.slice(2).find((a) => a === name || a.startsWith(prefix));
  if (!hit || hit === name) return undefined;
  return hit.slice(prefix.length);
}

async function main() {
  loadEnvSync();
  const { runBatchFollowups } = await import("../src/services/outreach/batchFollowups");

  const args = new Set(process.argv.slice(2));
  const minAgeArg = argValue("--min-age-hours");
  const limitArg = argValue("--limit");
  const emailsArg = argValue("--users");
  const mode = args.has("--send") ? "send" : "draft";
  const dryRun = !args.has("--queue") && !args.has("--send");
  if (mode === "send" && !args.has("--yes")) {
    console.error("Refusing immediate sends without --yes. Use --queue to create Gmail drafts.");
    process.exit(1);
  }

  const result = await runBatchFollowups({
    minAgeHours: minAgeArg ? Number(minAgeArg) : 36,
    limit: limitArg ? Number(limitArg) : undefined,
    userEmails: emailsArg ? emailsArg.split(",").map((e) => e.trim()).filter(Boolean) : undefined,
    mode,
    dryRun,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("batch followups failed", err);
  process.exit(1);
});
