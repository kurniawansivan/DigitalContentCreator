// Mobile projects run first and cover everything, because the product is mobile-first.
// Desktop projects run the critical flows.
//
// No "setup" / storageState project yet: there is no authentication in this ticket.
// Restore that project (see .claude/presets/playwright/playwright.config.ts) once
// MOMENTA-0002 (user accounts) lands.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";
const isContinuousIntegration = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  retries: 0,
  ...(isContinuousIntegration ? { workers: 4 } : {}),
  forbidOnly: isContinuousIntegration,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: isContinuousIntegration
    ? [["html", { open: "never" }], ["github"], ["list"]]
    : [["html", { open: "on-failure" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    testIdAttribute: "data-testid",
  },

  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      testMatch: /\.critical\.spec\.ts$/,
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop-safari",
      use: { ...devices["Desktop Safari"] },
      testMatch: /\.critical\.spec\.ts$/,
    },
  ],

  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !isContinuousIntegration,
    timeout: 120_000,
  },
});
