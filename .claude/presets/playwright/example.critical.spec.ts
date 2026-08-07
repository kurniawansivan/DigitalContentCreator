// Reference end-to-end test. Copy the shape, not the feature.
//
// Demonstrates: querying like a user, no hardcoded waits, per-test data, accessibility
// scanning on every new page, and asserting a real outcome rather than a rendered string.

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function buildUniqueEmailAddress(): string {
  return `person+${process.pid}-${performance.now().toString(36)}@example.test`;
}

test.describe("account registration", () => {
  test("a new customer can register and reach the dashboard", async ({ page }) => {
    const emailAddress = buildUniqueEmailAddress();

    await page.goto("/sign-up");

    await page.getByLabel("Email address").fill(emailAddress);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Create account" }).click();

    // Assertions retry until true. There is no waitForTimeout anywhere in this suite.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

    // Every new page gets an automated accessibility scan, so a regression fails the build.
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });

  test("registering with an address already in use shows a field error", async ({
    page,
    request,
  }) => {
    const emailAddress = buildUniqueEmailAddress();

    // Set up state through the API, never by driving the interface.
    const seedResponse = await request.post("/api/v1/users", {
      data: { emailAddress, password: "correct horse battery staple" },
    });
    expect(seedResponse.ok()).toBe(true);

    await page.goto("/sign-up");
    await page.getByLabel("Email address").fill(emailAddress);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("That email address is already registered"),
    ).toBeVisible();
    // The entered values survive the failure - losing a filled form is the worst outcome.
    await expect(page.getByLabel("Email address")).toHaveValue(emailAddress);
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("the form is fully operable by keyboard", async ({ page }) => {
    await page.goto("/sign-up");

    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Email address")).toBeFocused();

    await page.keyboard.type(buildUniqueEmailAddress());
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();

    await page.keyboard.type("correct horse battery staple");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Create account" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
