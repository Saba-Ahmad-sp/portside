import "server-only";

import { createAdminSupabase } from "@/lib/server/supabase/admin";
import type { ActivityType } from "@/lib/types";

/**
 * Portside — activity trail.
 *
 * Every meaningful change writes a row here, automatically, server-side. The
 * user never composes these; the code does. That is the difference between an
 * activity trail and a notes field.
 *
 * Written with the SERVICE ROLE, deliberately. There is no INSERT policy and
 * no INSERT grant on lead_activities for `anon` or `authenticated`, so the only
 * way a row can appear is through this module. A client cannot forge, edit or
 * delete history — an audit trail a user can write to is not an audit trail.
 *
 * Failures are logged and swallowed. Losing an audit row is bad; failing a
 * salesperson's status update because the audit write timed out is worse. In a
 * production system this would go to a durable queue with retries, which is
 * noted as future work in the README.
 */

type RecordActivityInput = {
  leadId: string;
  /** null when the system acted — e.g. a lead created from the public form. */
  actorId: string | null;
  type: ActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  const admin = createAdminSupabase();

  const { error } = await admin.from("lead_activities").insert({
    lead_id: input.leadId,
    actor_id: input.actorId,
    type: input.type,
    from_value: input.fromValue ?? null,
    to_value: input.toValue ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[portside] failed to record activity", {
      leadId: input.leadId,
      type: input.type,
      error: error.message,
    });
  }
}

/** Several activities in one write — used when a PATCH changes more than one field. */
export async function recordActivities(
  inputs: RecordActivityInput[],
): Promise<void> {
  if (inputs.length === 0) return;

  const admin = createAdminSupabase();

  const { error } = await admin.from("lead_activities").insert(
    inputs.map((input) => ({
      lead_id: input.leadId,
      actor_id: input.actorId,
      type: input.type,
      from_value: input.fromValue ?? null,
      to_value: input.toValue ?? null,
      metadata: input.metadata ?? {},
    })),
  );

  if (error) {
    console.error("[portside] failed to record activities", error.message);
  }
}
