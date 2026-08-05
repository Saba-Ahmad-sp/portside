import type { NextRequest } from "next/server";

import { ok, withRoute } from "@/lib/api/responses";
import { readJson, routeId } from "@/lib/api/route-helpers";
import { memberAccessSchema } from "@/lib/schemas/member";
import { requireSession } from "@/lib/server/dal";
import { setMemberActive } from "@/lib/server/lead-service";

type Context = { params: Promise<{ id: string }> };

/**
 * PATCH /api/members/:id/access — admin only.
 *
 * Its own endpoint rather than a general PATCH /api/members/:id, so the only
 * thing this route can express is "grant or revoke access". A general update
 * endpoint would eventually grow a `role` field, and changing who is an admin
 * deserves its own decision rather than arriving by accident through a body
 * someone forgot to constrain.
 *
 * 200 · 400 · 401 · 403 · 404 · 409 (self, or the last active admin) · 422
 */
export const PATCH = withRoute(async (request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params, "member");
  const input = await readJson(request, memberAccessSchema);

  return ok(await setMemberActive(session, id, input.isActive));
});
