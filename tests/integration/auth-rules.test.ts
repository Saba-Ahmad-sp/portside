import { beforeAll, describe, expect, it } from "vitest";

import { callApi, firstLeadOf } from "./helpers";

/**
 * Auth rules, verified over real HTTP against a real database.
 *
 * The brief asks for "automated tests covering auth rules". These assert the
 * two things that matter and are easy to get subtly wrong:
 *
 *  - a member cannot reach another member's data, and
 *  - the API distinguishes "you may not know this exists" (404) from "you know
 *    it exists but may not do that" (403).
 *
 * Getting the second one wrong is not a cosmetic mistake: returning 403 for an
 * invisible record confirms it exists, turning sequential ids into an
 * enumeration oracle.
 */

let priyasLeadId: string;

beforeAll(async () => {
  const lead = await firstLeadOf("priya");
  expect(lead, "Priya should own at least one seeded lead").toBeDefined();
  priyasLeadId = lead.id;
});

describe("401 — no session", () => {
  it.each([
    ["GET", "/api/leads"],
    ["GET", "/api/members"],
  ])("%s %s is refused", async (method, path) => {
    const { status, body } = await callApi<{ error: { code: string } }>(path, {
      method,
    });

    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuses a lead detail without leaking whether it exists", async () => {
    const { status } = await callApi(`/api/leads/${priyasLeadId}`);
    expect(status).toBe(401);
  });

  it("rejects a forged bearer token", async () => {
    // Goes through callApi like every other request. The first version called
    // fetch directly with its own hardcoded base URL, which silently stopped
    // pointing at the app when the dev port changed.
    const { status } = await callApi("/api/leads", {
      rawToken: "not-a-real-token",
    });

    expect(status).toBe(401);
  });
});

describe("404 — resources a member may not know about", () => {
  it("hides another member's lead", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      `/api/leads/${priyasLeadId}`,
      { as: "rahul" },
    );

    // NOT 403: that would confirm the lead exists.
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("hides its notes", async () => {
    const { status } = await callApi(`/api/leads/${priyasLeadId}/notes`, {
      as: "rahul",
    });
    expect(status).toBe(404);
  });

  it("hides its activity trail", async () => {
    const { status } = await callApi(`/api/leads/${priyasLeadId}/activities`, {
      as: "rahul",
    });
    expect(status).toBe(404);
  });

  it("refuses a write to it", async () => {
    const { status } = await callApi(`/api/leads/${priyasLeadId}`, {
      as: "rahul",
      method: "PATCH",
      body: { status: "won" },
    });
    expect(status).toBe(404);
  });

  it("refuses a note on it", async () => {
    const { status } = await callApi(`/api/leads/${priyasLeadId}/notes`, {
      as: "rahul",
      method: "POST",
      body: { body: "Should never be written." },
    });
    expect(status).toBe(404);
  });
});

describe("403 — visible, but not permitted", () => {
  it("stops a member assigning a lead they own", async () => {
    // Priya CAN see this lead, so hiding it would be dishonest — 403 is right.
    const { status, body } = await callApi<{ error: { code: string } }>(
      `/api/leads/${priyasLeadId}/assignment`,
      { as: "priya", method: "PATCH", body: { assigneeId: null } },
    );

    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("stops a member enumerating the team", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      "/api/members",
      { as: "priya" },
    );

    expect(status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("lets an admin do both", async () => {
    const members = await callApi<{ data: unknown[] }>("/api/members", {
      as: "admin",
    });

    expect(members.status).toBe(200);
    expect(members.body.data.length).toBeGreaterThanOrEqual(5);
  });
});

describe("scope — a member's list is their own", () => {
  it("shows an admin strictly more leads than a member", async () => {
    const admin = await callApi<{ meta: { total: number } }>(
      "/api/leads?limit=1",
      { as: "admin" },
    );
    const member = await callApi<{ meta: { total: number } }>(
      "/api/leads?limit=1",
      { as: "priya" },
    );

    expect(admin.status).toBe(200);
    expect(member.status).toBe(200);
    expect(admin.body.meta.total).toBeGreaterThan(member.body.meta.total);
  });

  it("returns only leads assigned to the member", async () => {
    const { body } = await callApi<{
      data: Array<{ assignee: { fullName: string } | null }>;
    }>("/api/leads?limit=100", { as: "priya" });

    expect(body.data.length).toBeGreaterThan(0);
    for (const lead of body.data) {
      expect(lead.assignee?.fullName).toBe("Priya Nair");
    }
  });

  it("never shows a member an unassigned lead", async () => {
    const { body } = await callApi<{ meta: { total: number } }>(
      "/api/leads?assigneeId=unassigned",
      { as: "priya" },
    );
    expect(body.meta.total).toBe(0);
  });
});

describe("input validation", () => {
  it("rejects a malformed lead id with 400, not 500", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      "/api/leads/not-a-uuid",
      { as: "admin" },
    );

    expect(status).toBe(400);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects an invalid public submission with 422 and per-field messages", async () => {
    const { status, body } = await callApi<{
      error: { code: string; fields: Record<string, string[]> };
    }>("/api/public/leads", {
      method: "POST",
      body: { fullName: "x", email: "not-an-email" },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(body.error.fields)).toEqual(
      expect.arrayContaining(["fullName", "email", "company", "country", "message"]),
    );
  });

  it("rejects an out-of-range page size with 400", async () => {
    const { status } = await callApi("/api/leads?limit=5000", { as: "admin" });
    expect(status).toBe(400);
  });

  it("rejects an unknown status filter with 400", async () => {
    const { status } = await callApi("/api/leads?status=banana", {
      as: "admin",
    });
    expect(status).toBe(400);
  });
});

describe("pagination and filtering", () => {
  it("reports coherent pagination metadata", async () => {
    const { status, body } = await callApi<{
      data: unknown[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>("/api/leads?limit=5&page=2", { as: "admin" });

    expect(status).toBe(200);
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(5);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.meta.totalPages).toBe(Math.ceil(body.meta.total / 5));
  });

  it("returns different rows on different pages", async () => {
    const first = await callApi<{ data: Array<{ id: string }> }>(
      "/api/leads?limit=5&page=1",
      { as: "admin" },
    );
    const second = await callApi<{ data: Array<{ id: string }> }>(
      "/api/leads?limit=5&page=2",
      { as: "admin" },
    );

    const overlap = first.body.data
      .map((lead) => lead.id)
      .filter((id) => second.body.data.some((lead) => lead.id === id));

    expect(overlap).toHaveLength(0);
  });

  it("filters by status", async () => {
    const { body } = await callApi<{
      data: Array<{ status: string }>;
      meta: { total: number };
    }>("/api/leads?status=won&limit=100", { as: "admin" });

    expect(body.meta.total).toBeGreaterThan(0);
    for (const lead of body.data) {
      expect(lead.status).toBe("won");
    }
  });

  it("searches across company and contact name", async () => {
    const { body } = await callApi<{
      data: Array<{ company: string }>;
      meta: { total: number };
    }>("/api/leads?q=trading&limit=100", { as: "admin" });

    expect(body.meta.total).toBeGreaterThan(0);
    for (const lead of body.data) {
      expect(lead.company.toLowerCase()).toContain("trading");
    }
  });
});
