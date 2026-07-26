import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Pagination as links, not buttons.
 *
 * Page position lives in the URL like every other filter, so each control is a
 * real anchor: middle-clickable, right-clickable, prefetched by Next, and
 * functional without JavaScript. A `<button onClick={setPage}>` would be none
 * of those things.
 */
export function PaginationBar({
  meta,
  searchParams,
  className,
}: {
  meta: PageMeta;
  /** The current query string, so filters survive a page change. */
  searchParams: Record<string, string | undefined>;
  className?: string;
}) {
  if (meta.totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "" && key !== "page") {
        params.set(key, value);
      }
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `?${query}` : "?";
  };

  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <p data-numeric className="label-manifest">
        {first}–{last} of {meta.total}
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(meta.page - 1)}
          disabled={meta.page <= 1}
          label="Previous page"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </PageLink>

        <span
          data-numeric
          className="px-3 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground"
        >
          {meta.page} / {meta.totalPages}
        </span>

        <PageLink
          href={hrefFor(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          label="Next page"
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] transition-colors";

  if (disabled) {
    return (
      <span
        aria-disabled
        className={cn(classes, "cursor-not-allowed opacity-35")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      scroll={false}
      className={cn(classes, "hover:border-brass/50 hover:text-brass")}
    >
      {children}
    </Link>
  );
}
