// scripts/synthesize-banker-profiles.ts — one-shot backfill that
// materialises banker_profiles rows from existing banker_findings.
// Same env-loading dance as scripts/run-architect.ts so the Anthropic
// SDK sees ANTHROPIC_API_KEY before any module instantiates a client.
//
// Usage:
//   tsx scripts/synthesize-banker-profiles.ts            # all bankers
//   tsx scripts/synthesize-banker-profiles.ts --force    # re-synth even if profile exists
//   tsx scripts/synthesize-banker-profiles.ts --limit 5  # cap N for testing

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

async function main() {
  loadEnvSync();
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

  const { restSelect, isNull, notNull } = await import("../src/lib/supabase-rest");
  const { synthesizeBankerProfile } = await import("../src/services/curator/synthesize-profile");

  // Pick bankers that HAVE findings (we need source data for synthesis).
  // Don't pre-filter on banker_profiles existence — let the function decide
  // via its skipped_already_has_profile branch.
  const bankers = await restSelect("bankers", {
    select: "id, name",
    filters: { name: notNull, linkedin_url: notNull },
    limit: limit ?? 200,
  });

  console.log(`Synthesizing profiles for ${bankers.length} bankers (force=${force})…\n`);

  const counts = { synthesized: 0, skipped_no_findings: 0, skipped_already_has_profile: 0, skipped_thin_signal: 0, error: 0 };
  for (const b of bankers) {
    process.stdout.write(`  ${b.name?.padEnd(28)} `);
    const result = await synthesizeBankerProfile(b.id, { force });
    counts[result.status]++;
    if (result.status === "synthesized") {
      console.log(`✓ ${result.about ? `about(${result.about.length} chars)` : "no about"} + ${result.postsAdded ?? 0} posts`);
    } else if (result.status === "error") {
      console.log(`✗ ${result.error}`);
    } else {
      console.log(result.status);
    }
    // Light rate-limit: 1.1s between calls. Anthropic burst tier handles
    // bursts but this avoids 529s on the rare unlucky day.
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log("\n=== Summary ===");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  // Suppress isNull — keeps the import tree-shake-friendly without an unused warning.
  void isNull;
}

main().catch((err) => {
  console.error("synthesis failed", err);
  process.exit(1);
});
