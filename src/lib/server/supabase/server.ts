import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { serverEnv } from "@/lib/server/env";

/**
 * User-scoped Supabase clients.
 *
 * Both of these act AS THE SIGNED-IN USER, so every query they run is subject
 * to Row Level Security. That is the point: the service layer's `can()` check
 * is the primary boundary, and RLS independently enforces the same rule
 * underneath it.
 *
 * Two flavours, because the API has two kinds of caller:
 *
 *   fromCookies()  the app itself — session lives in httpOnly cookies
 *   fromToken()    curl / Postman / any API client — Authorization: Bearer
 *
 * Supporting both is what makes the JSON API genuinely testable by someone who
 * is not sitting in a browser.
 */

/** Session from httpOnly cookies. Used by the app's own requests. */
export async function supabaseFromCookies() {
  const cookieStore = await cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: the session is refreshed in proxy.ts instead.
        }
      },
    },
  });
}

/** Session from an `Authorization: Bearer <access_token>` header. */
export function supabaseFromToken(accessToken: string) {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
