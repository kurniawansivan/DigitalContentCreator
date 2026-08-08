// Reference end-to-end test for this ticket. Requires the full stack running for real:
// `docker compose up -d postgres redis` (or the full stack) before `npm run test:e2e`.
//
// The "main failure path" (database unreachable) from this ticket's test plan is
// covered at the unit and integration level instead (health.service.test.ts: "reports
// only the database as down when the database check rejects"; route.integration.test.ts:
// "returns 503 SERVICE_UNAVAILABLE ... when the database is unreachable") - simulating a
// dead Postgres for a live browser run would need fault-injection infrastructure this
// foundation ticket does not build yet.

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("homepage health status", () => {
  test("shows the database as up when the full stack is healthy", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("status")).toHaveText(/Database: up/);

    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });
});
