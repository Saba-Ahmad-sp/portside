import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Two projects, because the tests answer different questions.
 *
 *  unit         pure functions, no I/O. Milliseconds. Runs on every save.
 *  integration  real HTTP against the running app and a real database, so the
 *               permission rules are proven end to end rather than mocked.
 *
 * Mocking the database for the integration tier would defeat the point: the
 * thing being verified is that the service layer AND Row Level Security agree.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Real network + database round trips.
          testTimeout: 30_000,
          hookTimeout: 30_000,
          // Sequential: these tests mutate shared rows.
          fileParallelism: false,
        },
      },
    ],
  },
});
