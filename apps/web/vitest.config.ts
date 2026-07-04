import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: "./src/test/setup.ts",
    env: {
      SUPABASE_URL: "https://example-project.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary", "json"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "**/*.test.*", "src/routes/**/route.tsx"],
      // Floors set from the measured baseline (~63/74/70 stmts/branches/funcs)
      // with a small buffer, not the 70/65/70 targets — most gaps are in
      // route files with no assertions yet, tracked separately.
      thresholds: {
        statements: 60,
        branches: 70,
        functions: 65,
      },
    },
  },
});
