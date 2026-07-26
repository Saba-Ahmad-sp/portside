import path from "node:path";

/**
 * Where each role's signed-in session is saved.
 *
 * A plain module rather than an export from auth.setup.ts — Playwright refuses
 * to let one test file import another, and this is shared by both.
 *
 * These files contain real session tokens, so playwright/.auth is gitignored.
 */
export const STATE = {
  admin: path.join(__dirname, "../../playwright/.auth/admin.json"),
  priya: path.join(__dirname, "../../playwright/.auth/priya.json"),
  rahul: path.join(__dirname, "../../playwright/.auth/rahul.json"),
} as const;

export type RoleName = keyof typeof STATE;
