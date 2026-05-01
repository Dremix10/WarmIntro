// vitest config — unit-only suite (D7 Option A from refactor-plan.md).
//
// `npm run test:unit`  → fast mocked-Supabase tests, sub-second feedback.
//                        Targets pure-logic helpers (warmth scoring,
//                        guardrails regex, stage validation, signal
//                        payload shapes, discriminated-union narrowing).
//
// Integration suite (real Postgres via `supabase start`) is intentionally
// not configured yet — see refactor-plan.md D7. The `tests/integration/`
// folder exists as scaffolding so future test files have a home, but
// they're skipped by this config until we add Docker locally.
//
// To add the integration suite later: introduce a `projects` array and
// add a second project pointing at tests/integration/**, plus a
// global-setup that boots `supabase start`. The unit suite stays
// untouched.

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "unit",
    include: ["tests/unit/**/*.test.ts"],
    // Explicitly exclude integration tests so they don't run in the
    // default `npm test` invocation. When the integration suite is
    // wired up, swap the exclude for a separate project config.
    exclude: ["tests/integration/**", "node_modules/**", ".next/**"],
    environment: "node",
  },
});
