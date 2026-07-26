import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/server/supabase/admin";

/**
 * Liveness probe.
 *
 * Also serves a second purpose: Supabase pauses free-tier projects after about
 * a week of no database activity, which would leave the deployed demo dead by
 * the time anyone opens it. A scheduled GitHub Action hits this endpoint daily,
 * and the count() below is what keeps the database considered active.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const admin = createAdminSupabase();
    const { count, error } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json(
      {
        data: {
          status: "ok",
          database: "reachable",
          leads: count ?? 0,
          latencyMs: Date.now() - startedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[portside] health check failed", error);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Database unreachable." } },
      { status: 503 },
    );
  }
}
