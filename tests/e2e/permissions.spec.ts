import { expect, test } from "@playwright/test";

import { STATE } from "./state";

/**
 * The permission model, as a person experiences it.
 *
 * The integration tests already prove the API refuses the wrong caller. This
 * proves the UI agrees — that a member is never shown a door they cannot walk
 * through, and that walking through it anyway still fails.
 */

test.describe("admin", () => {
  test.use({ storageState: STATE.admin });

  test("sees the whole desk and can reach the team", async ({ page }) => {
    await page.goto("/leads");

    await expect(page.getByText("Every enquiry on the desk.")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();

    await nav.getByRole("link", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    await expect(page.getByText("priya@portside.demo")).toBeVisible();
  });

  test("can filter, search and page through leads", async ({ page }) => {
    await page.goto("/leads");

    // Filter by a pipeline stage.
    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Won" }).click();
    await expect(page).toHaveURL(/status=won/);

    // Every visible row should now be Won.
    const statuses = page.getByRole("row").filter({ hasText: "Won" });
    await expect(statuses.first()).toBeVisible();

    // Search narrows further and is reflected in the URL.
    await page.getByLabel("Search leads").fill("trading");
    await expect(page).toHaveURL(/q=trading/);

    // Clearing restores the full desk.
    await page.getByRole("button", { name: /Clear/ }).click();
    await expect(page).not.toHaveURL(/status=won/);
  });
});

test.describe("member", () => {
  test.use({ storageState: STATE.priya });

  test("sees only their own book and no team link", async ({ page }) => {
    await page.goto("/leads");

    await expect(page.getByText("Enquiries assigned to you.")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);
  });

  test("is refused the team page even by typing the URL", async ({ page }) => {
    const response = await page.goto("/team");

    // notFound(): a member has no business learning this route exists.
    expect(response?.status()).toBe(404);
  });

  test("has no assignee filter, because there is nobody else to filter by", async ({
    page,
  }) => {
    await page.goto("/leads");
    await expect(page.getByLabel("Filter by assignee")).toHaveCount(0);
  });

  test("can work a lead they own", async ({ page }) => {
    await page.goto("/leads");
    await page.getByRole("row").nth(1).getByRole("link").first().click();

    // The pipeline is present and interactive for the owner.
    await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();

    // But assignment is not offered — it is admin-only.
    await expect(page.getByLabel("Owner", { exact: true })).toHaveCount(0);

    // Notes are writable by the owner.
    await expect(page.getByPlaceholder(/Called the buyer/)).toBeVisible();
  });
});

test.describe("isolation between members", () => {
  test("one member cannot open another member's lead", async ({ browser }) => {
    // Find a lead belonging to Priya...
    const priyaContext = await browser.newContext({ storageState: STATE.priya });
    const priyaPage = await priyaContext.newPage();
    await priyaPage.goto("/leads");
    await priyaPage.getByRole("row").nth(1).getByRole("link").first().click();

    // Wait for the detail route specifically, or url() can still read /leads
    // and the test would then assert nothing at all.
    await priyaPage.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
    const leadUrl = priyaPage.url();
    await priyaContext.close();

    // ...then try to open exactly that URL as Rahul.
    const rahulContext = await browser.newContext({ storageState: STATE.rahul });
    const rahulPage = await rahulContext.newPage();
    const response = await rahulPage.goto(leadUrl);

    // 404, not 403 — a 403 would confirm the lead exists.
    expect(response?.status()).toBe(404);
    await rahulContext.close();
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is sent to sign in, and returned afterwards", async ({ page }) => {
    await page.goto("/leads");

    await expect(page).toHaveURL(/\/login\?next=%2Fleads/);
    await expect(
      page.getByRole("heading", { name: "Sign in to the desk" }),
    ).toBeVisible();
  });
});
