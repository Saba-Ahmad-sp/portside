import type { NextRequest } from "next/server";

import { ok, withRoute } from "@/lib/api/responses";
import { readJson, routeId } from "@/lib/api/route-helpers";
import { assignmentSchema } from "@/lib/schemas/lead";
import { requireSession } from "@/lib/server/dal";
import { assignLead } from "@/lib/server/lead-service";

type Context = { params: Promise<{ id: string }> };

/**
 * PATCH /api/leads/:id/assignment — admin only.
 *
 * Body: { "assigneeId": "<uuid>" } or { "assigneeId": null } to unassign.
 *
 * Assignment is its own endpoint rather than a field on PATCH /leads/:id
 * because it is the one lead mutation with a different permission rule. Giving
 * it its own route means the rule is enforced in one obvious place instead of
 * hidden behind a conditional inside a general-purpose update.
 *
 * 200 · 401 · 403 (visible but not yours to assign) · 404 · 422
 */
export const PATCH = withRoute(async (request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);
  const input = await readJson(request, assignmentSchema);

  return ok(await assignLead(session, id, input));
});
