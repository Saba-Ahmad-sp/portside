import type { LucideIcon } from "lucide-react";

/**
 * The one empty state.
 *
 * "No results" screens are where apps look unfinished, and there are three
 * different reasons a table can be empty — nothing exists yet, nothing matches
 * the filters, or nothing is assigned to you. Each deserves different words,
 * so the copy is passed in rather than hardcoded.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-accent text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <p className="font-display text-lg">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
