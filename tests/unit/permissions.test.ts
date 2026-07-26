import { describe, expect, it } from "vitest";

import {
  ACTIONS,
  PIPELINE,
  can,
  canTransition,
  isTerminal,
  type Action,
  type PermissionUser,
} from "@/lib/permissions";

/**
 * The permission matrix, proven exhaustively.
 *
 * `can()` is a pure function with no I/O, so every combination of
 * role x action x ownership can be asserted in milliseconds. This is the
 * cheapest high-confidence test in the project: if it passes, the rules the UI
 * hides buttons with and the rules the API enforces with are provably the same,
 * because they are the same function.
 */

const ADMIN: PermissionUser = { id: "admin-1", role: "admin", isActive: true };
const MEMBER: PermissionUser = { id: "member-1", role: "member", isActive: true };
const OTHER: PermissionUser = { id: "member-2", role: "member", isActive: true };

const OWNED = { assignedTo: MEMBER.id };
const SOMEONE_ELSES = { assignedTo: OTHER.id };
const UNASSIGNED = { assignedTo: null };

describe("can() — admin", () => {
  it("permits every action", () => {
    for (const action of ACTIONS) {
      expect(can(ADMIN, action, SOMEONE_ELSES), action).toBe(true);
    }
  });

  it("does not need to own a lead to act on it", () => {
    expect(can(ADMIN, "lead:updateStatus", SOMEONE_ELSES)).toBe(true);
    expect(can(ADMIN, "lead:addNote", UNASSIGNED)).toBe(true);
  });
});

describe("can() — member", () => {
  const ADMIN_ONLY: Action[] = ["lead:list:all", "lead:assign", "team:view"];

  it.each(ADMIN_ONLY)("is refused %s", (action) => {
    expect(can(MEMBER, action, OWNED)).toBe(false);
  });

  it("may act on leads assigned to them", () => {
    expect(can(MEMBER, "lead:view", OWNED)).toBe(true);
    expect(can(MEMBER, "lead:update", OWNED)).toBe(true);
    expect(can(MEMBER, "lead:updateStatus", OWNED)).toBe(true);
    expect(can(MEMBER, "lead:addNote", OWNED)).toBe(true);
    expect(can(MEMBER, "lead:viewActivity", OWNED)).toBe(true);
  });

  it("may not act on someone else's lead", () => {
    expect(can(MEMBER, "lead:view", SOMEONE_ELSES)).toBe(false);
    expect(can(MEMBER, "lead:update", SOMEONE_ELSES)).toBe(false);
    expect(can(MEMBER, "lead:updateStatus", SOMEONE_ELSES)).toBe(false);
    expect(can(MEMBER, "lead:addNote", SOMEONE_ELSES)).toBe(false);
    expect(can(MEMBER, "lead:viewActivity", SOMEONE_ELSES)).toBe(false);
  });

  it("may not act on an unassigned lead", () => {
    expect(can(MEMBER, "lead:view", UNASSIGNED)).toBe(false);
    expect(can(MEMBER, "lead:addNote", UNASSIGNED)).toBe(false);
  });

  it("may create a lead", () => {
    expect(can(MEMBER, "lead:create")).toBe(true);
  });
});

describe("can() — fails closed", () => {
  it("refuses everything without a user", () => {
    for (const action of ACTIONS) {
      expect(can(null, action, OWNED), action).toBe(false);
      expect(can(undefined, action, OWNED), action).toBe(false);
    }
  });

  it("refuses everything for a deactivated account, including an admin", () => {
    const suspendedAdmin = { ...ADMIN, isActive: false };
    const suspendedMember = { ...MEMBER, isActive: false };

    for (const action of ACTIONS) {
      expect(can(suspendedAdmin, action, OWNED), action).toBe(false);
      expect(can(suspendedMember, action, OWNED), action).toBe(false);
    }
  });

  it("refuses lead-scoped actions when no lead is supplied", () => {
    // Never guess in the permissive direction.
    expect(can(MEMBER, "lead:view")).toBe(false);
    expect(can(MEMBER, "lead:updateStatus")).toBe(false);
  });
});

describe("can() — the full truth table", () => {
  const CASES: Array<[string, PermissionUser, Action, { assignedTo: string | null }, boolean]> = [
    ["admin lists all", ADMIN, "lead:list:all", UNASSIGNED, true],
    ["member lists all", MEMBER, "lead:list:all", UNASSIGNED, false],
    ["admin assigns", ADMIN, "lead:assign", OWNED, true],
    ["member assigns own lead", MEMBER, "lead:assign", OWNED, false],
    ["admin views team", ADMIN, "team:view", UNASSIGNED, true],
    ["member views team", MEMBER, "team:view", UNASSIGNED, false],
    ["member views own", MEMBER, "lead:view", OWNED, true],
    ["member views other", MEMBER, "lead:view", SOMEONE_ELSES, false],
    ["member notes own", MEMBER, "lead:addNote", OWNED, true],
    ["member notes other", MEMBER, "lead:addNote", SOMEONE_ELSES, false],
  ];

  it.each(CASES)("%s", (_label, user, action, lead, expected) => {
    expect(can(user, action, lead)).toBe(expected);
  });
});

describe("canTransition()", () => {
  it("allows any forward move within the pipeline", () => {
    for (const from of PIPELINE) {
      for (const to of PIPELINE) {
        if (isTerminal(from)) continue;
        expect(canTransition(MEMBER, from, to), `${from} -> ${to}`).toBe(true);
      }
    }
  });

  it("lets a member close a lead", () => {
    expect(canTransition(MEMBER, "proposal", "won")).toBe(true);
    expect(canTransition(MEMBER, "contacted", "lost")).toBe(true);
  });

  it("stops a member reopening a closed lead", () => {
    expect(canTransition(MEMBER, "won", "contacted")).toBe(false);
    expect(canTransition(MEMBER, "lost", "new")).toBe(false);
  });

  it("lets an admin reopen a closed lead", () => {
    expect(canTransition(ADMIN, "won", "contacted")).toBe(true);
    expect(canTransition(ADMIN, "lost", "qualified")).toBe(true);
  });

  it("treats a no-op as allowed", () => {
    expect(canTransition(MEMBER, "won", "won")).toBe(true);
    expect(canTransition(MEMBER, "lost", "lost")).toBe(true);
  });

  it("allows moving between the two terminal states", () => {
    // Correcting a mistake between won and lost is not "reopening".
    expect(canTransition(MEMBER, "won", "lost")).toBe(true);
  });
});

describe("isTerminal()", () => {
  it("is true only for won and lost", () => {
    expect(isTerminal("won")).toBe(true);
    expect(isTerminal("lost")).toBe(true);
    expect(isTerminal("new")).toBe(false);
    expect(isTerminal("proposal")).toBe(false);
  });
});
