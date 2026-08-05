import { beforeAll, describe, expect, it } from "vitest";

import { callApi } from "./helpers";

/**
 * The two core flows the brief asks for, end to end.
 *
 *   Flow 1  a visitor submits the public form and the lead appears, unassigned,
 *           with the activity trail already started
 *   Flow 2  an admin assigns it, the member works it, and every step is
 *           recorded automatically
 *
 * These run against a live instance and a real database, so what is being
 * proven is the whole stack: route handler, Zod validation, service
 * authorisation, repository, Row Level Security, and the activity service
 * writing with the service role.
 *
 * The lead used here is created by the test itself, so the suite never depends
 * on — or corrupts — the seeded data.
 */

type Activity = {
  type: string;
  actor: { id: string; fullName: string } | null;
  fromValue: string | null;
  toValue: string | null;
};

type Lead = {
  id: string;
  status: string;
  source: string;
  company: string;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string } | null;
};

let leadId: string;
let priyaId: string;

beforeAll(async () => {
  const { body } = await callApi<{
    data: Array<{ id: string; fullName: string }>;
  }>("/api/members", { as: "admin" });

  const priya = body.data.find((member) => member.fullName === "Priya Nair");
  expect(priya, "seeded member Priya Nair should exist").toBeDefined();
  priyaId = priya!.id;
});

describe("Flow 1 — a visitor submits the public capture form", () => {
  it("creates the lead and returns 201", async () => {
    const { status, body } = await callApi<{ data: { id: string } }>(
      "/api/public/leads",
      {
        method: "POST",
        body: {
          fullName: "Integration Test Buyer",
          email: "buyer@integration.test",
          company: "Integration Test Motors",
          country: "Bengaluru, India",
          message:
            "Automated test enquiry covering the public capture flow end to end.",
          productInterest: "ECE 22.06 full-face helmets",
          quantity: 1200,
        },
      },
    );

    expect(status).toBe(201);
    expect(body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    leadId = body.data.id;
  });

  it("stores it unassigned, as new, sourced from the website", async () => {
    const { status, body } = await callApi<{ data: Lead }>(
      `/api/leads/${leadId}`,
      { as: "admin" },
    );

    expect(status).toBe(200);
    // All four are set by the server, never read from the request body.
    expect(body.data.status).toBe("new");
    expect(body.data.source).toBe("website");
    expect(body.data.assignee).toBeNull();
    expect(body.data.createdBy).toBeNull();
  });

  it("ignores client-supplied values for server-controlled fields", async () => {
    const { status, body } = await callApi<{ data: { id: string } }>(
      "/api/public/leads",
      {
        method: "POST",
        body: {
          fullName: "Crafted Payload",
          email: "crafted@integration.test",
          company: "Crafted Payload Motors",
          country: "Pune, India",
          message: "Attempting to create a lead that is already won and assigned.",
          // None of these should have any effect.
          status: "won",
          source: "referral",
          assigned_to: priyaId,
          assigneeId: priyaId,
        },
      },
    );

    expect(status).toBe(201);

    const created = await callApi<{ data: Lead }>(
      `/api/leads/${body.data.id}`,
      { as: "admin" },
    );

    expect(created.body.data.status).toBe("new");
    expect(created.body.data.source).toBe("website");
    expect(created.body.data.assignee).toBeNull();
  });

  it("starts the activity trail with a system-authored entry", async () => {
    const { status, body } = await callApi<{ data: Activity[] }>(
      `/api/leads/${leadId}/activities`,
      { as: "admin" },
    );

    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe("lead_created");
    expect(body.data[0].toValue).toBe("new");
    // No logged-in user was involved, so no actor is claimed.
    expect(body.data[0].actor).toBeNull();
  });
});

describe("Flow 2 — an admin assigns it and the member works it", () => {
  it("lets the admin assign it to a member", async () => {
    const { status, body } = await callApi<{ data: Lead }>(
      `/api/leads/${leadId}/assignment`,
      { as: "admin", method: "PATCH", body: { assigneeId: priyaId } },
    );

    expect(status).toBe(200);
    expect(body.data.assignee?.id).toBe(priyaId);
  });

  it("makes it visible to the assignee and no one else", async () => {
    const mine = await callApi(`/api/leads/${leadId}`, { as: "priya" });
    const theirs = await callApi(`/api/leads/${leadId}`, { as: "rahul" });

    expect(mine.status).toBe(200);
    expect(theirs.status).toBe(404);
  });

  it("still refuses to let the assignee reassign it", async () => {
    const { status } = await callApi(`/api/leads/${leadId}/assignment`, {
      as: "priya",
      method: "PATCH",
      body: { assigneeId: null },
    });

    // She can see it, so 403 rather than 404.
    expect(status).toBe(403);
  });

  it("lets the assignee move it along the pipeline", async () => {
    const { status, body } = await callApi<{ data: Lead }>(
      `/api/leads/${leadId}`,
      { as: "priya", method: "PATCH", body: { status: "contacted" } },
    );

    expect(status).toBe(200);
    expect(body.data.status).toBe("contacted");
  });

  it("lets the assignee add a timestamped note", async () => {
    const { status, body } = await callApi<{
      data: { body: string; author: { fullName: string }; createdAt: string };
    }>(`/api/leads/${leadId}/notes`, {
      as: "priya",
      method: "POST",
      body: { body: "Called the buyer, pricing sent for a 3-month contract." },
    });

    expect(status).toBe(201);
    expect(body.data.author.fullName).toBe("Priya Nair");
    expect(Date.parse(body.data.createdAt)).not.toBeNaN();
  });

  it("rejects an empty note", async () => {
    const { status } = await callApi(`/api/leads/${leadId}/notes`, {
      as: "priya",
      method: "POST",
      body: { body: "   " },
    });

    expect(status).toBe(422);
  });

  it("has recorded every step, in order, without anyone writing it", async () => {
    const { body } = await callApi<{ data: Activity[] }>(
      `/api/leads/${leadId}/activities`,
      { as: "priya" },
    );

    // Newest first.
    const types = body.data.map((activity) => activity.type);
    expect(types).toEqual([
      "note_added",
      "status_changed",
      "assigned",
      "lead_created",
    ]);

    const statusChange = body.data.find((a) => a.type === "status_changed")!;
    expect(statusChange.fromValue).toBe("new");
    expect(statusChange.toValue).toBe("contacted");
    expect(statusChange.actor?.fullName).toBe("Priya Nair");

    const assignment = body.data.find((a) => a.type === "assigned")!;
    expect(assignment.actor?.fullName).toBe("Saba Ahmad");
  });
});

describe("Flow 2b — closing and reopening", () => {
  it("lets the assignee close the lead as lost", async () => {
    const { status, body } = await callApi<{ data: Lead }>(
      `/api/leads/${leadId}`,
      { as: "priya", method: "PATCH", body: { status: "lost" } },
    );

    expect(status).toBe(200);
    expect(body.data.status).toBe("lost");
  });

  it("stops the member reopening it, with 409 rather than 403", async () => {
    const { status, body } = await callApi<{ error: { code: string } }>(
      `/api/leads/${leadId}`,
      { as: "priya", method: "PATCH", body: { status: "qualified" } },
    );

    // The body is valid and she is allowed to edit this lead — it is the state
    // transition that is refused.
    expect(status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("lets an admin reopen it", async () => {
    const { status, body } = await callApi<{ data: Lead }>(
      `/api/leads/${leadId}`,
      { as: "admin", method: "PATCH", body: { status: "qualified" } },
    );

    expect(status).toBe(200);
    expect(body.data.status).toBe("qualified");
  });
});
