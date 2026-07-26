import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Portside — proxy (formerly middleware.ts, renamed in Next.js 16).
 *
 * This does TWO things, and deliberately not a third:
 *
 *  1. Refreshes the Supabase session cookie. Server Components cannot write
 *     cookies, so without this the session would silently expire mid-visit.
 *  2. Redirects for UX — signed-out users away from the app, signed-in users
 *     away from the login page.
 *
 * What it does NOT do is authorise anything. The Next.js docs are explicit
 * that proxy checks should be optimistic only, because "a matcher change or a
 * refactor that moves a Server Function to a different route can silently
 * remove Proxy coverage." Every route handler and service call re-verifies the
 * session against the database through the DAL, so deleting this file would
 * cost a redirect, not a security boundary.
 */

const PUBLIC_ROUTES = ["/", "/login", "/auth"];
const AUTH_ROUTES = ["/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates against Supabase and refreshes the cookie as a side
  // effect. getSession() would only decode whatever the browser sent.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/leads";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except static assets and /api. API routes authenticate
     * themselves through the DAL and must return 401 JSON rather than a
     * redirect to an HTML login page.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
