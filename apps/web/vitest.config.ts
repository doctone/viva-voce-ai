import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
      // Only exists inside workerd; see src/test/cloudflare-workers.ts.
      "cloudflare:workers": resolve(__dirname, "./src/test/cloudflare-workers.ts"),
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
      // Reported, not gated: a floor rewards tests written for coverage.
      // See TESTING.md.
    },
  },
});
