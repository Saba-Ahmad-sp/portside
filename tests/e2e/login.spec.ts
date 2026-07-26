import { expect, test } from "@playwright/test";

/**
 * Sign-in.
 *
 * The click-to-fill demo accounts exist because a password manager silently
 * autofilling a saved credential over the demo one is an easy way for someone
 * to conclude the app is broken when it is not. Since a reviewer depends on
 * that shortcut working, it is tested rather than assumed.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("demo account shortcuts", () => {
  test("picking an account fills the form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toHaveValue("");

    await page.getByRole("link", { name: /admin@portside\.demo/ }).click();

    await expect(page).toHaveURL(/demo=admin/);
    await expect(page.getByLabel("Email")).toHaveValue("admin@portside.demo");
    await expect(page.getByLabel("Password")).toHaveValue("PortsideDemo!2026");
  });

  test("picking a different account replaces the first", async ({ page }) => {
    await page.goto("/login?demo=admin");
    await expect(page.getByLabel("Email")).toHaveValue("admin@portside.demo");

    await page.getByRole("link", { name: /priya@portside\.demo/ }).click();

    // The form is keyed on ?demo=, so it remounts with the new defaults rather
    // than keeping the previous account's email.
    await expect(page.getByLabel("Email")).toHaveValue("priya@portside.demo");
  });

  test("a filled form actually signs in", async ({ page }) => {
    await page.goto("/login?demo=admin");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", { name: "Leads", level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Every enquiry on the desk.")).toBeVisible();
  });
});

test.describe("failed sign-in", () => {
  test("reports failure without revealing which field was wrong", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@portside.demo");
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Scoped to the form: Next.js injects its own role="alert" route
    // announcer into every page, so an unscoped getByRole("alert") matches two
    // elements and fails strict mode.
    const alert = page.locator("form").getByRole("alert");
    await expect(alert).toBeVisible();

    // Distinguishing "no such user" from "wrong password" would let anyone
    // enumerate who works here.
    await expect(alert).toContainText("did not work");
    await expect(alert).not.toContainText(/password is|user not found|no account/i);
  });
});
