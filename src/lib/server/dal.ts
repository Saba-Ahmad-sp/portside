import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/responses";
import type { PermissionUser } from "@/lib/permissions";
import {
  supabaseFromCookies,
  supabaseFromToken,
} from "@/lib/server/supabase/server";

/**
 * Portside — Data Access Layer.
 *
 * This is the recommended Next.js pattern: a server-only module that resolves
 * the session once, verifies it, and hands back both the caller's identity and
 * a database client scoped to that caller.
 *
 * Two things it deliberately does NOT rely on:
 *
 *  - proxy.ts. Proxy is an optimistic redirect for UX only. The Next.js docs
 *    warn that a matcher change or a refactor can silently remove proxy
 *    coverage, so authorisation is verified here, next to the data.
 *
 *  - Layouts. Layouts do not re-render on navigation under partial rendering,
 *    so a check there would not run on every route change.
 *
 * Wrapped in React `cache()` so that a page rendering a header, a table and a
 * detail panel resolves the session once per request, not three times.
 */

export type SessionUser = PermissionUser & {
  fullName: string;
  email: string;
};

export type Session = {
  user: SessionUser;
  /**
   * A Supabase client acting AS THIS USER. Every query it runs is subject to
   * Row Level Security. Services and repositories must use this client, never
   * the admin one, so RLS stays a real second layer rather than decoration.
   */
  db: SupabaseClient;
};

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Resolves the current session, or null.
 *
 * Accepts either an `Authorization: Bearer <access_token>` header (API
 * clients, curl, the integration tests) or the httpOnly cookie session (the
 * app itself). Same identity, same RLS, either way.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const requestHeaders = await headers();
  const bearer = readBearerToken(requestHeaders.get("authorization"));

  const db = bearer
    ? supabaseFromToken(bearer)
    : await supabaseFromCookies();

  // getUser() revalidates the token against Supabase. getSession() only decodes
  // whatever the client sent, so it must never be trusted server-side.
  const {
    data: { user },
    error,
  } = await db.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    db,
    user: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      isActive: profile.is_active,
    },
  };
});

/**
 * The session, or a 401. Every authenticated route handler starts here.
 *
 * A deactivated account is treated as unauthenticated rather than forbidden —
 * there is no action it could take, so there is nothing to distinguish.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session || !session.user.isActive) {
    throw ApiError.unauthenticated();
  }
  return session;
}

/**
 * The same check for pages rather than route handlers: a browser wants a
 * redirect to the sign-in screen, not a 401 JSON body.
 *
 * This is the real gate for every authenticated page. proxy.ts also redirects,
 * but only optimistically — this runs next to the data, so a page cannot render
 * without it.
 */
export async function requireSessionOrRedirect(): Promise<Session> {
  const session = await getSession();

  // Signed out entirely: straight to the sign-in screen.
  if (!session) redirect("/login");

  /**
   * Authenticated, but the account has been switched off.
   *
   * Supabase Auth still regards the token as perfectly valid — `is_active` is
   * a column in our profiles table, not something Auth knows about — so the
   * browser is holding a live session cookie for an account that may do
   * nothing at all.
   *
   * A bare redirect to /login would be sent straight back here by proxy.ts,
   * which sees a signed-in user asking for the sign-in page and helpfully
   * returns them to the app. Two correct rules, opposite directions, forever.
   *
   * The marker breaks the tie: proxy.ts lets this one land, and the sign-in
   * page clears the dead cookie and explains why they are back.
   */
  if (!session.user.isActive) redirect("/login?revoked=1");

  return session;
}
