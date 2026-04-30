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
  },
});
