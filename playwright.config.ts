import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/**
 * Matches the port `npm run dev` binds to. Pinned explicitly rather than left
 * to Next's "port in use, trying the next one" fallback, which would silently
 * move the app out from under the tests.
 */
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3100";

/**
 * Playwright covers what the integration tests cannot: that a real person, in a
 * real browser, can do the job — and that the permission model holds at the UI
 * as well as at the API.
 *
 * Each role signs in once in the `setup` project and its session is saved to
 * disk, so the specs start already authenticated instead of replaying a login
 * form dozens of times. Those files hold real session tokens, which is why
 * playwright/.auth is gitignored.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
