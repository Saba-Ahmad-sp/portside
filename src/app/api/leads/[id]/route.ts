import type { NextRequest } from "next/server";

import { ok, withRoute } from "@/lib/api/responses";
import { readJson, routeId } from "@/lib/api/route-helpers";
import { leadUpdateSchema } from "@/lib/schemas/lead";
import { requireSession } from "@/lib/server/dal";
import { getLead, updateLead } from "@/lib/server/lead-service";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/leads/:id
 *
 * 200 the lead
 * 401 no session
 * 404 the lead does not exist, OR the caller may not know that it does
 *
 * The second half of that 404 is deliberate. Returning 403 for a lead a member
 * is not assigned to would confirm the record exists and turn ids into an
 * enumeration oracle.
 */
export const GET = withRoute(async (_request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);

  return ok(await getLead(session, id));
});

/**
 * PATCH /api/leads/:id — update details and/or move the lead along the pipeline.
 *
 * 200 the updated lead
 * 401 no session
 * 403 the lead is visible, but this caller may not modify it
 * 404 not visible to this caller
 * 409 valid body, but the status change is not allowed from the current state
 * 422 the body failed validation
 */
export const PATCH = withRoute(async (request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);
  const patch = await readJson(request, leadUpdateSchema);

  return ok(await updateLead(session, id, patch));
});
