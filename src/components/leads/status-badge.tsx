import { cn } from "@/lib/utils";
import { STATUS_LABELS, type LeadStatus } from "@/lib/types";

/**
 * The one place a lead status is rendered.
 *
 * Colours come from the CSS custom properties declared in globals.css, so the
 * pipeline palette is defined once and consumed by the badge, the stepper, the
 * table and the dashboard tiles alike.
 *
 * A dot plus small caps rather than a filled pill: on a table of forty rows,
 * forty coloured pills is noise, whereas forty small dots scan as a column.
 */
const DOT: Record<LeadStatus, string> = {
  new: "bg-status-new",
  contacted: "bg-status-contacted",
  qualified: "bg-status-qualified",
  proposal: "bg-status-proposal",
  won: "bg-status-won",
  lost: "bg-status-lost",
};

const TEXT: Record<LeadStatus, string> = {
  new: "text-status-new",
  contacted: "text-status-contacted",
  qualified: "text-status-qualified",
  proposal: "text-status-proposal",
  won: "text-status-won",
  lost: "text-status-lost",
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: LeadStatus;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono uppercase tracking-[0.12em] whitespace-nowrap",
        size === "sm" ? "text-[0.6875rem]" : "text-xs",
        TEXT[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          DOT[status],
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
