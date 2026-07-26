import type { NextRequest } from "next/server";

import { ApiError, paginated, withRoute } from "@/lib/api/responses";
import { parseLeadQuery } from "@/lib/schemas/lead";
import { requireSession } from "@/lib/server/dal";
import { getLeads } from "@/lib/server/lead-service";

/**
 * GET /api/leads — paginated, filterable list.
 *
 * Query parameters:
 *   page        default 1
 *   limit       default 20, max 100
 *   status      new | contacted | qualified | proposal | won | lost
 *   assigneeId  a user id, or the literal "unassigned"
 *   q           matches name, company or email
 *   sort        created_at | -created_at | updated_at | -updated_at
 *
 * An admin sees every lead. A member sees only leads assigned to them — that
 * is applied in the service, and Row Level Security enforces it again below.
 *
 * 200 with { data, meta }. 400 for a malformed query. 401 with no session.
 */
export const GET = withRoute(async (request: NextRequest) => {
  const session = await requireSession();

  const parsed = parseLeadQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    // Bad query parameters are a malformed request, not an invalid body.
    const first = parsed.error.issues[0];
    throw ApiError.badRequest(
      `Invalid query parameter "${first.path.join(".")}": ${first.message}`,
    );
  }

  const result = await getLeads(session, parsed.data);
  return paginated(result.data, result.meta);
});
