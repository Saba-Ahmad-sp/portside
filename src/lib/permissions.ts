/**
 * Portside — the permission matrix.
 *
 * THIS FILE MUST STAY PURE.
 *
 * No imports. No database access. No `process.env`. No `server-only`.
 * It is imported by BOTH the client (to hide actions a user cannot perform)
 * and the server (to enforce them). One function, so the two can never drift
 * apart — the button you can't see is the button the API also refuses.
 *
 * Hiding a button is not security. The server calls `can()` again, and Row
 * Level Security enforces the same rule a third time at the database.
 *
 * Everything here is exhaustively covered by tests/unit/permissions.test.ts.
 */

export type Role = "admin" | "member";

/** The smallest slice of a user needed to make a decision — safe to serialise to the browser. */
export type PermissionUser = {
  id: string;
  role: Role;
  isActive: boolean;
};

/** The smallest slice of a lead needed to make a decision. */
export type LeadRef = {
  assignedTo: string | null;
};

export type Action =
  /** See every lead in the organisation, not just your own. */
  | "lead:list:all"
  /** Open a specific lead. */
  | "lead:view"
  /** Create a lead from inside the app (the public form is unauthenticated). */
  | "lead:create"
  /** Move a lead along the pipeline. */
  | "lead:updateStatus"
  /** Edit a lead's contact/enquiry details. */
  | "lead:update"
  /** Assign or reassign a lead to a user. */
  | "lead:assign"
  /** Add a timestamped note. */
  | "lead:addNote"
  /** Read the activity trail. */
  | "lead:viewActivity"
  /** See the team directory. */
  | "team:view";

export const ACTIONS: readonly Action[] = [
  "lead:list:all",
  "lead:view",
  "lead:create",
  "lead:updateStatus",
  "lead:update",
  "lead:assign",
  "lead:addNote",
  "lead:viewActivity",
  "team:view",
] as const;

const isAdmin = (user: PermissionUser) => user.role === "admin";

const isAssignee = (user: PermissionUser, lead: LeadRef | undefined) =>
  lead !== undefined && lead.assignedTo !== null && lead.assignedTo === user.id;

/**
 * The single source of truth for "may this user do this?".
 *
 * `lead` is required for any lead-scoped action. When it is omitted for such an
 * action the answer is `false` — we never guess in the permissive direction.
 */
export function can(
  user: PermissionUser | null | undefined,
  action: Action,
  lead?: LeadRef,
): boolean {
  // No session, or a deactivated account, can do nothing.
  if (!user || !user.isActive) return false;

  switch (action) {
    // --- Admin-only -------------------------------------------------------
    case "lead:list:all":
    case "lead:assign":
    case "team:view":
      return isAdmin(user);

    // --- Any active staff member -----------------------------------------
    case "lead:create":
      return true;

    // --- Admin, or the person the lead is assigned to ----------------------
    case "lead:view":
    case "lead:update":
    case "lead:updateStatus":
    case "lead:addNote":
    case "lead:viewActivity":
      return isAdmin(user) || isAssignee(user, lead);

    default: {
      // Exhaustiveness guard: adding an Action without handling it here is a
      // compile error, not a silently-permitted endpoint.
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Pipeline                                                                  */
/* -------------------------------------------------------------------------- */

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

/** Ordered pipeline stages, rendered as a stepper on the lead detail page. */
export const PIPELINE: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
] as const;

/** Terminal states. A lead that is won or lost has left the pipeline. */
export const TERMINAL_STATUSES: readonly LeadStatus[] = ["won", "lost"] as const;

export const isTerminal = (status: LeadStatus) =>
  TERMINAL_STATUSES.includes(status);

/**
 * Reopening a closed lead is an admin decision — a member should not be able to
 * quietly move a Lost deal back into the pipeline to massage their numbers.
 * Violations return 409 Conflict, not 422: the body is valid, the state is not.
 */
export function canTransition(
  user: PermissionUser,
  from: LeadStatus,
  to: LeadStatus,
): boolean {
  if (from === to) return true;
  if (isTerminal(from) && !isTerminal(to)) return isAdmin(user);
  return true;
}
