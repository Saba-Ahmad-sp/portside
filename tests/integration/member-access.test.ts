import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ACCESS_REVOKED_MESSAGE } from "@/lib/permissions";
import { callApi } from "./helpers";

/**
 * Revoking and restoring a colleague's access.
 *
 * `is_active` was in the schema and enforced everywhere from the start — can()
 * refuses every action for an inactive user and the DAL rejects their session —
 * but nothing could set it. These tests cover the three refusals that stop the
 * new endpoint being a way to lock the organisation out of itself:
 *
 *   a member calling it at all           403
 *   an admin deactivating themselves     409
 *   an admin deactivating the last admin  409
 *
 * Aisha is used as the subject because no other spec depends on her, and her
 * access is restored in afterAll so a failure here cannot cascade.
 */

type Member = { id: string; fullName: string; role: string; isActive: boolean };

let aisha: Member;
let priya: Member;
let saba: Member;

beforeAll(async () => {
  const { body } = await callApi<{ data: Member[] }>("/api/members", {
    as: "admin",
  });

  aisha = body.data.find((m) => m.fullName === "Aisha Rahman")!;
  priya = body.data.find((m) => m.fullName === "Priya Nair")!;
  saba = body.data.find((m) => m.fullName === "Saba Ahmad")!;

  expect(aisha, "seeded member Aisha Rahman should exist").toBeDefined();
});

afterAll(async () => {
  // Never leave a demo account locked out, whatever happened above.
  await callApi(`/api/members/${aisha.id}/access`, {
    as: "admin",
    method: "PATCH",
    body: { isActive: true },
  });
});

describe("who may change access", () => {
  it("refuses a member with 403", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      `/api/members/${aisha.id}/access`,
      { as: "priya", method: "PATCH", body: { isActive: false } },
    );

    // Priya can see the team exists — she just may not change it.
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("refuses an unauthenticated caller with 401", async () => {
    const { status } = await callApi(`/api/members/${aisha.id}/access`, {
      method: "PATCH",
      body: { isActive: false },
    });

    expect(status).toBe(401);
  });

  it("rejects a malformed member id with 400", async () => {
    const { status, body } = await callApi<{ error: { message: string } }>(
      "/api/members/not-a-uuid/access",
      { as: "admin", method: "PATCH", body: { isActive: false } },
    );

    expect(status).toBe(400);
    // The message names the right thing, not "lead".
    expect(body.error.message).toMatch(/member id/i);
  });

  it("rejects a body without isActive with 422", async () => {
    const { status } = await callApi(`/api/members/${aisha.id}/access`, {
      as: "admin",
      method: "PATCH",
      body: { active: "yes" },
    });

    expect(status).toBe(422);
  });

  it("404s for a user that does not exist", async () => {
    const { status } = await callApi(
      "/api/members/00000000-0000-4000-8000-000000000000/access",
      { as: "admin", method: "PATCH", body: { isActive: false } },
    );

    expect(status).toBe(404);
  });
});

describe("guards against locking everyone out", () => {
  it("stops an admin removing their own access", async () => {
    const { status, body } = await callApi<{
      error: { code: string; message: string };
    }>(`/api/members/${saba.id}/access`, {
      as: "admin",
      method: "PATCH",
      body: { isActive: false },
    });

    expect(status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toMatch(/your own access/i);
  });

  it("stops one admin removing another admin's access", async () => {
    const { body: team } = await callApi<{ data: Member[] }>("/api/members", {
      as: "admin",
    });
    const otherAdmin = team.data.find(
      (m) => m.role === "admin" && m.id !== saba.id,
    )!;

    const { status, body } = await callApi<{
      error: { code: string; message: string };
    }>(`/api/members/${otherAdmin.id}/access`, {
      as: "admin",
      method: "PATCH",
      body: { isActive: false },
    });

    // Only members are managed here. With role changes out of scope, revoking
    // an admin would be one-way from inside the app.
    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toMatch(/only members/i);

    // And it really did not happen.
    const { body: after } = await callApi<{ data: Member[] }>("/api/members", {
      as: "admin",
    });
    expect(after.data.find((m) => m.id === otherAdmin.id)?.isActive).toBe(true);
  });
});

describe("revoking and restoring", () => {
  it("removes access, and the account can no longer act", async () => {
    const { status, body } = await callApi<{ data: Member }>(
      `/api/members/${aisha.id}/access`,
      { as: "admin", method: "PATCH", body: { isActive: false } },
    );

    expect(status).toBe(200);
    expect(body.data.isActive).toBe(false);

    // The session was valid a moment ago. It must now be refused — this is the
    // whole point of the feature, and it is enforced in the DAL rather than by
    // hiding UI.
    const { status: afterRevoke } = await callApi("/api/leads", { as: "aisha" });
    expect(afterRevoke).toBe(401);
  });

  it("no longer offers them as an assignee", async () => {
    const { body } = await callApi<{ data: Member[] }>("/api/members", {
      as: "admin",
    });

    const stillListed = body.data.find((m) => m.id === aisha.id);
    // Still in the directory, but visibly without access.
    expect(stillListed?.isActive).toBe(false);
  });

  it("restores access, and the account works again", async () => {
    const { status, body } = await callApi<{ data: Member }>(
      `/api/members/${aisha.id}/access`,
      { as: "admin", method: "PATCH", body: { isActive: true } },
    );

    expect(status).toBe(200);
    expect(body.data.isActive).toBe(true);

    const { status: afterRestore } = await callApi("/api/leads", { as: "aisha" });
    expect(afterRestore).toBe(200);
  });

  it("treats a no-op as success rather than an error", async () => {
    const { status, body } = await callApi<{ data: Member }>(
      `/api/members/${priya.id}/access`,
      { as: "admin", method: "PATCH", body: { isActive: true } },
    );

    expect(status).toBe(200);
    expect(body.data.isActive).toBe(true);
  });
});

/**
 * GET /api/session — the endpoint that lets the sign-in screen explain itself.
 *
 * Supabase Auth does not know what `is_active` is, so a deactivated colleague's
 * password still works and still yields a valid token. Without something to ask,
 * the app signed them in, bounced them out, and bounced them back in a loop.
 *
 * This is the only endpoint that separates 403 from 401 for a switched-off
 * account. It can afford to: a 403 is unreachable without a valid session, so
 * the distinction is drawn for someone who has already proved who they are.
 */
describe("GET /api/session", () => {
  it("returns the caller's own identity", async () => {
    const { status, body } = await callApi<{ data: Member & { email: string } }>(
      "/api/session",
      { as: "priya" },
    );

    expect(status).toBe(200);
    expect(body.data.email).toBe("priya@portside.demo");
    expect(body.data.role).toBe("member");
    expect(body.data.isActive).toBe(true);
  });

  it("refuses an unauthenticated caller with 401", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      "/api/session",
    );

    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("tells a deactivated account why, while the rest of the API still says 401", async () => {
    await callApi(`/api/members/${aisha.id}/access`, {
      as: "admin",
      method: "PATCH",
      body: { isActive: false },
    });

    const { status, body } = await callApi<{
      error: { code: string; message: string };
    }>("/api/session", { as: "aisha" });

    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    // The exact wording the sign-in screen puts in the toast.
    expect(body.error.message).toBe(ACCESS_REVOKED_MESSAGE);

    // Everywhere else the two cases stay collapsed, so nothing is leaked to a
    // caller who has not authenticated.
    const { status: leads } = await callApi("/api/leads", { as: "aisha" });
    expect(leads).toBe(401);

    await callApi(`/api/members/${aisha.id}/access`, {
      as: "admin",
      method: "PATCH",
      body: { isActive: true },
    });
  });
});
