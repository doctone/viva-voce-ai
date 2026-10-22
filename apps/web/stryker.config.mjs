/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  reporters: ["html", "clear-text", "progress"],
  mutate: [
    "src/features/**/*.ts",
    "src/features/**/*.tsx",
    "!src/features/**/*.test.{ts,tsx}",
    // Thin framework wiring (server functions, hooks) has no business logic to mutate yet.
    "!src/features/**/*ServerFn.ts",
    "!src/features/**/use*.ts",
    // Vendor wiring: the prompt and schema are checked by the evaluation fixtures, not by mutation.
    "!src/features/**/*OpenAi.ts",
  ],
  thresholds: {
    break: 60,
    high: 80,
    low: 70,
  },
  tempDirName: "stryker-tmp",
};
