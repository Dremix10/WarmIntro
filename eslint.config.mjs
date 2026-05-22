import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored PDF.js workers — minified, not our code.
    "public/pdf.worker.*",
    // Claude Code worktrees — separate checkouts, linted on their own.
    ".claude/**",
  ]),
  // React Compiler-style rules: real signals, not runtime bugs. Treat as
  // warnings so they don't block CI; cleanup tracked separately (#52).
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
