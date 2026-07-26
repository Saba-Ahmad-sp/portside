"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — AUTHENTICATION ONLY.
 *
 * The browser signs in and maintains its session here. It never queries the
 * database. All application data goes through /api/*, for two reasons:
 *
 *  1. The brief requires a documented JSON API, and the app consuming its own
 *     API is what proves that API actually works.
 *  2. Task B of the same brief names "direct database calls from the frontend"
 *     as a defect to be fixed. Doing it here while condemning it there would
 *     be incoherent.
 *
 * Only the anon key is ever exposed to the browser, and Row Level Security
 * means that key alone grants no read access to any table.
 */

let client: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabase() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
