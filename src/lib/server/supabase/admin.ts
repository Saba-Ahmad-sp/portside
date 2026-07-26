import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/server/env";

/**
 * Service-role Supabase client — BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` at the top of this file means importing it from a
 * client component is a build error, not a runtime surprise.
 *
 * Deliberately used in exactly three places, and nowhere else:
 *
 *  1. activity-service — the audit trail is system-owned. There is no INSERT
 *     policy on lead_activities for anon or authenticated, so no client can
 *     forge, edit or erase history. An audit trail a user can write to is not
 *     an audit trail.
 *
 *  2. The public capture form — an anonymous visitor has no database access at
 *     all. /api/public/leads validates with Zod, forces source/status/assignee
 *     server-side, and writes on the visitor's behalf.
 *
 *  3. scripts/seed.ts — provisioning demo users and data.
 *
 * Every other read and write goes through the user-scoped client in
 * ./server.ts so that RLS applies.
 */
export function createAdminSupabase() {
  return createClient(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
