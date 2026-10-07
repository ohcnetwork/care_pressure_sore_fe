import { defineConfig } from "@playwright/test";

// Run from the care_fe root: generic host helpers resolve its saved test fixtures.
export default defineConfig({
  testDir: "./tests",
  tsconfig: "../../tsconfig.json",
  outputDir: "./output/playwright/results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.CARE_GROUP_VALIDATION_URL ?? "http://localhost:4000",
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
});
