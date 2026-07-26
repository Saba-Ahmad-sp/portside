import type { NextRequest } from "next/server";

import { ok, withRoute } from "@/lib/api/responses";
import { routeId } from "@/lib/api/route-helpers";
import { requireSession } from "@/lib/server/dal";
import { getActivities } from "@/lib/server/lead-service";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/leads/:id/activities — the audit trail, newest first.
 *
 * Read-only by design. There is no POST here, no INSERT policy and no INSERT
 * grant on the table for any client role; the trail is written exclusively by
 * the activity service using the service role. An audit trail a user can write
 * to is not an audit trail.
 *
 * 200 · 401 · 404
 */
export const GET = withRoute(async (_request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);

  return ok(await getActivities(session, id));
});
