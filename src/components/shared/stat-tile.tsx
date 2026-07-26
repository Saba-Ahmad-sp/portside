import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A single number with a label, in the ledger style: hairline box, mono figure,
 * small-caps caption.
 *
 * Every tile is a link into the filtered leads view, so the overview is a way
 * into the work rather than a read-only wall of statistics — clicking
 * "Qualified · 6" lands you on those six leads.
 */
export function StatTile({
  label,
  value,
  caption,
  href,
  accentClassName,
}: {
  label: string;
  value: string | number;
  caption?: string;
  href?: string;
  /** A pipeline colour class, e.g. "text-status-qualified". */
  accentClassName?: string;
}) {
  const body = (
    <>
      <p className="label-manifest">{label}</p>
      <p
        data-numeric
        className={cn(
          "mt-2 font-display text-3xl leading-none",
          accentClassName,
        )}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
      )}
    </>
  );

  const className =
    "glass-card block rounded-2xl border border-border p-5 transition-all duration-200";

  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "hover:-translate-y-0.5 hover:border-brass/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  );
}
