import { expect, test } from "@playwright/test";

import { STATE } from "./state";

/**
 * Core flow 1, through the browser.
 *
 * A visitor with no account fills in the public form, and the enquiry appears
 * on the desk as a new, unassigned lead with its activity trail already
 * started.
 */

// Deliberately signed out — this is the one route that must work for a stranger.
test.use({ storageState: { cookies: [], origins: [] } });

const stamp = Date.now();
const COMPANY = `E2E Capture Co ${stamp}`;

test.describe("public capture form", () => {
  test("a visitor can submit an enquiry", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Every enquiry/i }),
    ).toBeVisible();

    // The attribution the brief requires must be on the live page.
    await expect(
      page.getByRole("link", { name: "Built for Digital Heroes Training Task" }),
    ).toBeVisible();

    await page.getByLabel("Your name").fill("Playwright Buyer");
    await page.getByLabel("Work email").fill(`buyer+${stamp}@e2e.test`);
    await page.getByLabel("Company").fill(COMPANY);
    await page.getByLabel("Your location").fill("Bengaluru, India");
    await page
      .getByLabel("What are you looking for?")
      .fill("End-to-end browser test of the public capture flow.");

    await page.getByRole("button", { name: "Send enquiry" }).click();

    await expect(page.getByRole("status")).toContainText("Enquiry received");
  });

  test("it rejects an invalid submission without leaving the page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel("Your name").fill("x");
    await page.getByLabel("Work email").fill("not-an-email");
    await page.getByRole("button", { name: "Send enquiry" }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});

test.describe("the enquiry reaches the desk", () => {
  test.use({ storageState: STATE.admin });

  test("an admin finds it, unassigned and new", async ({ page }) => {
    await page.goto(`/leads?q=${encodeURIComponent(`E2E Capture Co ${stamp}`)}`);

    const row = page.getByRole("row").filter({ hasText: COMPANY });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Unassigned");
    await expect(row).toContainText("New");

    await row.getByRole("link", { name: COMPANY }).click();

    await expect(page.getByRole("heading", { name: COMPANY })).toBeVisible();
    // Written by the server, not by anybody using the app.
    await expect(
      page.getByText("Lead created from the public enquiry form"),
    ).toBeVisible();
  });
});
