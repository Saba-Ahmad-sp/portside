import { ok, withRoute } from "@/lib/api/responses";
import { requireSession } from "@/lib/server/dal";
import { getMembers } from "@/lib/server/lead-service";

/**
 * GET /api/members — admin only.
 *
 * Powers the assignee picker and the team page. A member calling this gets 403
 * rather than 404: they know the team exists, they simply may not enumerate it.
 * That is the mirror image of the lead rule, and the distinction is what makes
 * both codes meaningful.
 *
 * 200 · 401 · 403
 */
export const GET = withRoute(async () => {
  const session = await requireSession();
  return ok(await getMembers(session));
});
