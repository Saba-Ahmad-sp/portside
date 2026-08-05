import { ApiError, ok, withRoute } from "@/lib/api/responses";
import { ACCESS_REVOKED_MESSAGE } from "@/lib/permissions";
import { getSession } from "@/lib/server/dal";
import type { MemberDTO } from "@/lib/types";

/**
 * GET /api/session — who am I, and may I be here?
 *
 * The one endpoint that deliberately breaks the 401-for-everything rule the
 * rest of the API follows.
 *
 * Everywhere else, `requireSession()` answers 401 for a deactivated account
 * exactly as it does for no account at all: there is no action either can take,
 * so there is nothing worth distinguishing, and collapsing them tells an
 * attacker nothing. Here it matters. The caller has just proved they hold the
 * password, and "wrong password" and "your access was withdrawn" are different
 * problems with different fixes — one you retype, the other you ring an
 * administrator about. Leaving someone to guess which is a bad answer.
 *
 * The distinction leaks nothing, because 403 is only reachable with a valid
 * session token. A stranger still gets a flat 401.
 *
 * Accepts a Bearer token as well as the cookie. The sign-in form uses the token
 * it was just handed rather than waiting for the cookie to be written, so the
 * check cannot race the browser.
 */
export const GET = withRoute(async () => {
  const session = await getSession();

  if (!session) throw ApiError.unauthenticated();
  if (!session.user.isActive) throw ApiError.forbidden(ACCESS_REVOKED_MESSAGE);

  const me: MemberDTO = {
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    role: session.user.role,
    isActive: session.user.isActive,
  };

  return ok(me);
});
