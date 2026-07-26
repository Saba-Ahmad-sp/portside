"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES } from "@/lib/schemas/lead";
import { STATUS_LABELS, type MemberDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Filter, sort and search — all held in the URL.
 *
 * The URL is the single source of truth rather than component state, which
 * buys three things for free: a filtered view is shareable and bookmarkable,
 * it survives a refresh and the back button, and the query string maps
 * one-to-one onto the API's parameters. The screen and the endpoint take the
 * same arguments, so there is nothing to translate between them.
 *
 * Changing a filter pushes a new URL; the Server Component above re-runs and
 * returns fresh rows. `useTransition` keeps the old rows on screen, dimmed,
 * instead of flashing a skeleton on every keystroke.
 */

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-updated_at", label: "Recently updated" },
] as const;

const ALL = "all";

export function LeadFilters({
  members,
  canFilterByAssignee,
  total,
}: {
  members: MemberDTO[];
  canFilterByAssignee: boolean;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(currentQ);

  /** Rewrites the query string, always resetting to page 1. */
  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === ALL) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Any change to the result set invalidates the current page number.
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Debounce the search box so typing "westbridge" is one request, not ten.
  useEffect(() => {
    if (search === currentQ) return;
    const timer = setTimeout(() => apply({ q: search || null }), 300);
    return () => clearTimeout(timer);
  }, [search, currentQ, apply]);

  // Keep the box in step when the URL changes from elsewhere (back button,
  // "clear all", a link).
  useEffect(() => setSearch(currentQ), [currentQ]);

  const status = searchParams.get("status") ?? ALL;
  const assigneeId = searchParams.get("assigneeId") ?? ALL;
  const sort = searchParams.get("sort") ?? "-created_at";

  const activeCount =
    (currentQ ? 1 : 0) + (status !== ALL ? 1 : 0) + (assigneeId !== ALL ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* ------------------------------------------------------- search */}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, company or email"
            aria-label="Search leads"
            className="h-9 bg-card pl-9 text-sm"
          />
          {isPending && (
            <Loader2
              aria-hidden
              className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          )}
        </div>

        {/* ------------------------------------------------------- status */}
        <Select value={status} onValueChange={(value) => apply({ status: value })}>
          <SelectTrigger
            aria-label="Filter by status"
            className="h-9 w-[9.5rem] bg-card text-sm"
          >
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            {LEAD_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ----------------------------------------------------- assignee */}
        {/* Only admins can see other people's leads, so only admins get this. */}
        {canFilterByAssignee && (
          <Select
            value={assigneeId}
            onValueChange={(value) => apply({ assigneeId: value })}
          >
            <SelectTrigger
              aria-label="Filter by assignee"
              className="h-9 w-[11rem] bg-card text-sm"
            >
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* --------------------------------------------------------- sort */}
        <Select value={sort} onValueChange={(value) => apply({ sort: value })}>
          <SelectTrigger
            aria-label="Sort leads"
            className="h-9 w-[11rem] bg-card text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              apply({ q: null, status: null, assigneeId: null })
            }
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
            Clear {activeCount}
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        className={cn(
          "label-manifest transition-opacity",
          isPending && "opacity-50",
        )}
      >
        {total === 0
          ? "No leads match"
          : `${total} lead${total === 1 ? "" : "s"}`}
        {activeCount > 0 && " · filtered"}
      </p>
    </div>
  );
}
