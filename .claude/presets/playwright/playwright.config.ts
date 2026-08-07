// Install: npm i -D @playwright/test @axe-core/playwright
//
// Mobile projects run first and cover everything, because the product is mobile-first.
// Desktop projects run the critical flows.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const IS_CONTINUOUS_INTEGRATION = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  // A flaky test is a defect to fix, not a test to retry. Zero retries makes that visible.
  retries: 0,
  workers: IS_CONTINUOUS_INTEGRATION ? 4 : undefined,
  // No test may pass by accident because the suite was empty.
  forbidOnly: IS_CONTINUOUS_INTEGRATION,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: IS_CONTINUOUS_INTEGRATION
    ? [["html", { open: "never" }], ["github"], ["list"]]
    : [["html", { open: "on-failure" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    // Never use a hardcoded wait. Playwright assertions retry until the condition holds.
    testIdAttribute: "data-testid",
  },

  projects: [
    // Seeds a signed-in storage state through the API, so no test signs in through the form.
    { name: "setup", testMatch: /global\.setup\.ts/ },

    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      dependencies: ["setup"],
      testMatch: /.*\.critical\.spec\.ts/,
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      dependencies: ["setup"],
    },
    {
      name: "desktop-safari",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
      testMatch: /.*\.critical\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !IS_CONTINUOUS_INTEGRATION,
    timeout: 120_000,
  },
});
