import "server-only";

import { ApiError } from "@/lib/api/responses";
import { can, canTransition } from "@/lib/permissions";
import type {
  AssignmentInput,
  LeadQuery,
  LeadUpdateInput,
  PublicLeadInput,
} from "@/lib/schemas/lead";
import { recordActivities, recordActivity } from "@/lib/server/activity-service";
import type { Session } from "@/lib/server/dal";
import * as repo from "@/lib/server/lead-repository";
import { createAdminSupabase } from "@/lib/server/supabase/admin";
import type {
  ActivityDTO,
  LeadDTO,
  LeadListItemDTO,
  MemberDTO,
  NoteDTO,
  Paginated,
} from "@/lib/types";

/**
 * Portside — service layer.
 *
 * The ONLY place business rules and authorisation live. Server Components call
 * these functions directly; route handlers call the same functions and add
 * nothing but HTTP. Neither path can skip a check, because there is no other
 * way to reach the repository.
 *
 * Authorisation is `can()` from lib/permissions.ts — the same pure function the
 * UI uses to decide whether to render a button. Enforcement and presentation
 * cannot drift apart because they are literally the same code.
 *
 * ---------------------------------------------------------------------------
 * On 404 vs 403
 *
 * A lead the caller may not see is indistinguishable from one that does not
 * exist: RLS returns nothing, the repository returns null, we raise 404. A lead
 * the caller CAN see but may not act on raises 403.
 *
 *   member GETs another member's lead        -> 404  (existence not confirmed)
 *   member assigns a lead they can see       -> 403  (existence already known)
 *
 * Returning 403 in the first case would turn IDs into an enumeration oracle.
 * ---------------------------------------------------------------------------
 */

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getLeads(
  session: Session,
  query: LeadQuery,
): Promise<Paginated<LeadListItemDTO>> {
  const seesEverything = can(session.user, "lead:list:all");

  return repo.listLeads(session.db, query, {
    restrictToAssignee: seesEverything ? undefined : session.user.id,
  });
}

export async function getLead(session: Session, id: string): Promise<LeadDTO> {
  const lead = await repo.findLeadById(session.db, id);
  if (!lead) throw ApiError.notFound("Lead not found.");

  if (!can(session.user, "lead:view", { assignedTo: lead.assignee?.id ?? null })) {
    throw ApiError.notFound("Lead not found.");
  }

  return lead;
}

export async function getNotes(session: Session, id: string): Promise<NoteDTO[]> {
  await assertCanReach(session, id, "lead:view");
  return repo.listNotes(session.db, id);
}

export async function getActivities(
  session: Session,
  id: string,
): Promise<ActivityDTO[]> {
  await assertCanReach(session, id, "lead:viewActivity");
  return repo.listActivities(session.db, id);
}

/**
 * Pipeline summary for the overview page. Scoped the same way the list is: an
 * admin sees the whole desk, a member sees only their own book.
 */
export async function getStats(session: Session) {
  const seesEverything = can(session.user, "lead:list:all");

  return repo.leadStats(session.db, {
    restrictToAssignee: seesEverything ? undefined : session.user.id,
  });
}

export async function getMembers(session: Session): Promise<MemberDTO[]> {
  if (!can(session.user, "team:view")) {
    throw ApiError.forbidden("Only admins can view the team.");
  }
  return repo.listMembers(session.db);
}

/** The team, plus how many open leads each person is carrying. Admin only. */
export async function getTeamWithWorkload(session: Session) {
  const members = await getMembers(session);
  const workload = await repo.memberWorkload(
    session.db,
    members.map((member) => member.id),
  );

  return members.map((member) => ({
    ...member,
    openLeads: workload[member.id] ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Public capture                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The public form. No session, and `anon` has no database privileges at all —
 * this runs with the service role on the visitor's behalf.
 *
 * Every field that carries meaning is set HERE, not taken from the request, so
 * a crafted POST cannot create a lead that is already assigned, already marked
 * Won, or attributed to a staff member.
 */
export async function createLeadFromPublicForm(
  input: PublicLeadInput,
): Promise<{ id: string }> {
  // Honeypot: bots fill hidden fields. Accept and discard, so the bot cannot
  // tell it was caught and simply retry with the field removed.
  if (input.website) return { id: "00000000-0000-0000-0000-000000000000" };

  const admin = createAdminSupabase();

  const lead = await repo.insertLead(admin, {
    full_name: input.fullName,
    email: input.email,
    company: input.company,
    country: input.country,
    message: input.message,
    phone: input.phone || null,
    product_interest: input.productInterest || null,
    quantity: input.quantity ?? null,

    // Server-controlled. Never read from the request body.
    source: "website",
    status: "new",
    assigned_to: null,
    created_by: null,
  });

  await recordActivity({
    leadId: lead.id,
    actorId: null,
    type: "lead_created",
    toValue: "new",
    metadata: { source: "website", company: input.company },
  });

  return { id: lead.id };
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export async function updateLead(
  session: Session,
  id: string,
  patch: LeadUpdateInput,
): Promise<LeadDTO> {
  const current = await assertCanReach(session, id, "lead:view");
  const leadRef = { assignedTo: current.assignedTo };

  const wantsStatusChange =
    patch.status !== undefined && patch.status !== current.status;

  const action = wantsStatusChange ? "lead:updateStatus" : "lead:update";
  if (!can(session.user, action, leadRef)) {
    throw ApiError.forbidden("You cannot modify this lead.");
  }

  if (wantsStatusChange && !canTransition(session.user, current.status, patch.status!)) {
    // Valid body, invalid state change -> 409, not 422.
    throw ApiError.conflict(
      `A lead marked "${current.status}" can only be reopened by an admin.`,
    );
  }

  const updated = await repo.updateLead(session.db, id, toColumns(patch));
  if (!updated) throw ApiError.notFound("Lead not found.");

  if (wantsStatusChange) {
    await recordActivity({
      leadId: id,
      actorId: session.user.id,
      type: "status_changed",
      fromValue: current.status,
      toValue: patch.status!,
    });
  }

  return updated;
}

export async function assignLead(
  session: Session,
  id: string,
  input: AssignmentInput,
): Promise<LeadDTO> {
  const current = await assertCanReach(session, id, "lead:view");

  // The lead is visible, so 403 is the honest answer here — not 404.
  if (!can(session.user, "lead:assign", { assignedTo: current.assignedTo })) {
    throw ApiError.forbidden("Only admins can assign leads.");
  }

  if (input.assigneeId && !(await repo.memberExists(session.db, input.assigneeId))) {
    throw ApiError.validation({ assigneeId: ["No active user with that id."] });
  }

  if (current.assignedTo === input.assigneeId) {
    return getLead(session, id); // No-op; do not write a misleading activity row.
  }

  const updated = await repo.updateLead(session.db, id, {
    assigned_to: input.assigneeId,
  });
  if (!updated) throw ApiError.notFound("Lead not found.");

  await recordActivity({
    leadId: id,
    actorId: session.user.id,
    type: input.assigneeId ? "assigned" : "unassigned",
    fromValue: current.assignedTo,
    toValue: input.assigneeId,
    metadata: { assigneeName: updated.assignee?.fullName ?? null },
  });

  return updated;
}

export async function addNote(
  session: Session,
  id: string,
  body: string,
): Promise<NoteDTO> {
  const current = await assertCanReach(session, id, "lead:view");

  if (!can(session.user, "lead:addNote", { assignedTo: current.assignedTo })) {
    throw ApiError.forbidden("You cannot add notes to this lead.");
  }

  const note = await repo.insertNote(session.db, id, session.user.id, body);

  await recordActivity({
    leadId: id,
    actorId: session.user.id,
    type: "note_added",
    metadata: { noteId: note.id, preview: body.slice(0, 80) },
  });

  return note;
}

/* -------------------------------------------------------------------------- */
/*  Internals                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Resolves a lead and confirms the caller is allowed to know it exists.
 * Anything that fails here is a 404, never a 403 — see the note at the top.
 */
async function assertCanReach(
  session: Session,
  id: string,
  action: Parameters<typeof can>[1],
) {
  const current = await repo.findLeadAssignment(session.db, id);
  if (!current) throw ApiError.notFound("Lead not found.");

  if (!can(session.user, action, { assignedTo: current.assignedTo })) {
    throw ApiError.notFound("Lead not found.");
  }

  return current;
}

/** DTO field names -> database column names. */
function toColumns(patch: LeadUpdateInput): Record<string, unknown> {
  const map: Record<keyof LeadUpdateInput, string> = {
    fullName: "full_name",
    email: "email",
    phone: "phone",
    company: "company",
    country: "country",
    productInterest: "product_interest",
    quantity: "quantity",
    estValueInr: "est_value_inr",
    message: "message",
    status: "status",
  };

  const columns: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = map[key as keyof LeadUpdateInput];
    if (column) columns[column] = value;
  }
  return columns;
}

/** Re-exported so route handlers import one module. */
export { recordActivities };
