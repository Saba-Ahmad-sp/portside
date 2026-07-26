import { expect, test as setup } from "@playwright/test";

import { STATE } from "./state";

/**
 * Signs each demo role in once and saves the session to disk.
 *
 * Every spec then starts authenticated, which keeps the tests about the thing
 * being tested rather than about logging in. It also exercises the real sign-in
 * form once per run, so a broken login fails the suite immediately rather than
 * silently.
 */

const PASSWORD = process.env.SEED_PASSWORD ?? "PortsideDemo!2026";

const ROLES = [
  { name: "admin", email: "admin@portside.demo", landing: "Leads" },
  { name: "priya", email: "priya@portside.demo", landing: "Leads" },
  { name: "rahul", email: "rahul@portside.demo", landing: "Leads" },
] as const;

for (const role of ROLES) {
  setup(`authenticate as ${role.name}`, async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(role.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Landing on the desk is the proof the session was actually established.
    await expect(
      page.getByRole("heading", { name: role.landing, level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    await page.context().storageState({ path: STATE[role.name] });
  });
}
