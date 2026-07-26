import type { NextRequest } from "next/server";

import { created, withRoute } from "@/lib/api/responses";
import { readJson } from "@/lib/api/route-helpers";
import { publicLeadSchema } from "@/lib/schemas/lead";
import { createLeadFromPublicForm } from "@/lib/server/lead-service";

/**
 * POST /api/public/leads — the public capture endpoint. No authentication.
 *
 * The only unauthenticated write in the system. `anon` has no database
 * privileges at all, so this runs server-side on the visitor's behalf and the
 * service decides every field that carries meaning — source, status, assignee
 * and creator are set in code, never read from the body. A crafted POST cannot
 * create a lead that is already assigned or already marked Won.
 *
 * 201 with the new id. 422 when the body fails validation.
 */
export const POST = withRoute(async (request: NextRequest) => {
  const input = await readJson(request, publicLeadSchema);
  const lead = await createLeadFromPublicForm(input);

  return created({ id: lead.id });
});
