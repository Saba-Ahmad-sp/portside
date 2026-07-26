import type { NextRequest } from "next/server";

import { created, ok, withRoute } from "@/lib/api/responses";
import { readJson, routeId } from "@/lib/api/route-helpers";
import { noteSchema } from "@/lib/schemas/lead";
import { requireSession } from "@/lib/server/dal";
import { addNote, getNotes } from "@/lib/server/lead-service";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/leads/:id/notes — newest first.
 *
 * 200 · 401 · 404
 */
export const GET = withRoute(async (_request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);

  return ok(await getNotes(session, id));
});

/**
 * POST /api/leads/:id/notes
 *
 * Notes are append-only: there is no PATCH or DELETE here, and none at the
 * database either. A note is a timestamped record of what was said, so editing
 * it after the fact would undermine the trail it belongs to.
 *
 * 201 · 401 · 403 · 404 · 422
 */
export const POST = withRoute(async (request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);
  const { body } = await readJson(request, noteSchema);

  return created(await addNote(session, id, body));
});
