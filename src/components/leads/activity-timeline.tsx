"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  FileText,
  IndianRupee,
  MessageSquare,
  Sparkles,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { useActivities } from "@/lib/hooks/use-lead";
import { formatAbsolute, formatRelative, formatValue } from "@/lib/format";
import { STATUS_LABELS, type ActivityDTO, type LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The activity trail — a ship's log down the side of the lead.
 *
 * Nothing here is written by a user. Every row was created server-side by the
 * activity service the moment something changed, using the service role,
 * against a table with no INSERT policy or grant for any client. There is no
 * way to add, edit or remove an entry through the application, which is what
 * separates an audit trail from a comments field.
 */

const ICONS: Record<ActivityDTO["type"], LucideIcon> = {
  lead_created: Sparkles,
  assigned: UserPlus,
  unassigned: UserMinus,
  status_changed: FileText,
  note_added: MessageSquare,
  value_changed: IndianRupee,
};

/** Turns a row into a sentence. The one place activity copy is written. */
function describe(activity: ActivityDTO): React.ReactNode {
  const actor = activity.actor?.fullName;
  const who = actor ?? "The website";

  switch (activity.type) {
    case "lead_created":
      return actor
        ? `${actor} added this lead manually`
        : "Lead created from the public enquiry form";

    case "assigned": {
      const name = (activity.metadata.assigneeName as string) ?? "a colleague";
      return `${who} assigned this lead to ${name}`;
    }

    case "unassigned":
      return `${who} removed the owner from this lead`;

    case "status_changed": {
      const from = activity.fromValue as LeadStatus | null;
      const to = activity.toValue as LeadStatus | null;
      return (
        <>
          {who} moved this from{" "}
          <span className="text-foreground">
            {from ? STATUS_LABELS[from] : "—"}
          </span>{" "}
          to{" "}
          <span className={cn(to && `text-status-${to}`)}>
            {to ? STATUS_LABELS[to] : "—"}
          </span>
        </>
      );
    }

    case "note_added":
      return `${who} added a note`;

    case "value_changed": {
      const from = activity.fromValue === null ? null : Number(activity.fromValue);
      const to = activity.toValue === null ? null : Number(activity.toValue);

      if (from === null) {
        return (
          <>
            {who} valued this at{" "}
            <span className="text-brass">{formatValue(to)}</span>
          </>
        );
      }

      if (to === null) {
        return `${who} cleared the estimated value`;
      }

      return (
        <>
          {who} changed the estimate from {formatValue(from)} to{" "}
          <span className={to > from ? "text-status-won" : "text-status-lost"}>
            {formatValue(to)}
          </span>
        </>
      );
    }

    default:
      return `${who} made a change`;
  }
}

export function ActivityTimeline({
  leadId,
  initialActivities,
}: {
  leadId: string;
  initialActivities: ActivityDTO[];
}) {
  const reduceMotion = useReducedMotion();
  const { data: activities } = useActivities(leadId, initialActivities);

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="label-manifest">
        Activity
      </h2>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing recorded yet.
        </p>
      ) : (
        <ol className="relative mt-4 space-y-0">
          {/* The rule the log hangs from. */}
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-[0.6875rem] w-px bg-border"
          />

          {activities.map((activity, index) => {
            const Icon = ICONS[activity.type] ?? FileText;

            return (
              <motion.li
                key={activity.id}
                initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.28,
                  delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.35),
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative flex gap-3.5 pb-5 last:pb-0"
              >
                <span
                  aria-hidden
                  className="relative z-10 mt-0.5 flex size-[1.375rem] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                >
                  <Icon className="size-3" />
                </span>

                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-snug text-muted-foreground">
                    {describe(activity)}
                  </p>
                  <time
                    dateTime={activity.createdAt}
                    title={formatAbsolute(activity.createdAt)}
                    className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground/70"
                  >
                    {formatRelative(activity.createdAt)}
                  </time>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
