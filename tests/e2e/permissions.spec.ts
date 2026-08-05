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

  test("asks before closing a lead, and cancelling changes nothing", async ({
    page,
  }) => {
    await page.goto("/leads");

    // Any lead still in the pipeline. Picking by position or filtering on a
    // specific status would couple this to whatever the seed happened to
    // assign her; a closed lead has no "Mark as lost" button at all.
    await page
      .locator("tbody tr")
      .filter({ hasNotText: /Won|Lost/ })
      .first()
      .getByRole("link")
      .first()
      .click();

    await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);

    await page.getByRole("button", { name: "Mark as lost" }).click();

    // Losing a lead is a terminal state a member cannot undo, so it asks.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Mark this lead as lost?");
    await expect(dialog).toContainText("nothing is deleted");
    // A member is told they will need an admin to reverse it.
    await expect(dialog).toContainText("needs an admin");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Still in the pipeline — cancelling was not a silent confirm.
    await expect(page.getByRole("button", { name: "Mark as lost" })).toBeVisible();
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

test.describe("mobile navigation drawer", () => {
  test.use({ storageState: STATE.admin, viewport: { width: 390, height: 780 } });

  test("escapes the header's stacking context and covers the page", async ({
    page,
  }) => {
    await page.goto("/leads");
    await page.getByRole("button", { name: /open navigation menu/i }).click();

    const drawer = page.getByRole("navigation", { name: "Mobile main" });
    await expect(drawer).toBeVisible();

    const check = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Mobile main"]')!;
      const box = nav.getBoundingClientRect();

      return {
        // Rendered under <body>, not inside <header>. The header is
        // position:sticky with a z-index, which creates a stacking context —
        // a drawer inside it can never paint above the page content, however
        // high its own z-index. That looked exactly like transparency.
        insideHeader: Boolean(nav.closest("header")),
        // Whatever the browser hit-tests at the drawer's centre must be the
        // drawer itself, not a table row behind it.
        topmostIsDrawer: Boolean(
          document
            .elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            ?.closest('nav[aria-label="Mobile main"]'),
        ),
        opaque: getComputedStyle(nav).backgroundColor,
      };
    });

    expect(check.insideHeader, "drawer must be portalled out of the header").toBe(false);
    expect(check.topmostIsDrawer, "page content must not paint over the drawer").toBe(true);
    expect(check.opaque).not.toMatch(/rgba\(.*,\s*0?\.\d+\)/);
  });

  test("its links navigate and it closes", async ({ page }) => {
    await page.goto("/leads");
    await page.getByRole("button", { name: /open navigation menu/i }).click();

    const drawer = page.getByRole("navigation", { name: "Mobile main" });
    await drawer.getByRole("link", { name: "Team" }).click();

    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    await expect(drawer).toBeHidden();
  });
});

test.describe("signing out", () => {
  /**
   * Signs in fresh rather than reusing a saved session, and as the second
   * admin, who no other spec touches. Signing out ends that session — reusing
   * the shared admin state here would leave every later spec unauthenticated.
   */
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the user menu opens and signs the user out", async ({ page }) => {
    // This regressed silently once: shadcn now generates Base UI, whose
    // GroupLabel throws outside a Menu.Group. The menu crashed on open, so no
    // items rendered and there was no way to switch accounts. Nothing else in
    // the suite touched it.
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/login");
    await page.getByLabel("Email").fill("dev@portside.demo");
    await page.getByLabel("Password").fill("PortsideDemo!2026");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("heading", { name: "Leads", level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button")
      .filter({ hasText: /Imran Qureshi/i })
      .first()
      .click();

    const signOut = page.getByRole("menuitem", { name: /sign out/i });
    await expect(signOut).toBeVisible();

    await signOut.click();
    await page.waitForURL(/\/login/);

    // The session is really gone, not just the redirect.
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/login/);

    expect(pageErrors, "the menu must not throw").toEqual([]);
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
