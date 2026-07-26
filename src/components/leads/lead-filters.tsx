"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Loader2, Search, SlidersHorizontal, X } from "lucide-react";

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
 * buys three things: a filtered view is shareable and bookmarkable, it survives
 * a refresh and the back button, and the query string maps one-to-one onto the
 * API's parameters. The screen and the endpoint take the same arguments.
 *
 * Layout: search takes the full first line, because it is the control people
 * reach for most and a cramped search box is a bad search box. Filters and
 * sort sit on the second line, right-aligned against the result count.
 *
 * Each control keeps a FIXED label — "Status", "Owner", "Sort" — rather than
 * being replaced by whatever is selected. A row of dropdowns reading
 * "all · all · -created_at" tells you nothing about what they do, and the raw
 * sort key leaks an implementation detail. Active filters are signalled by a
 * dot on the control and a single count on the Clear button.
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
  const [syncedQ, setSyncedQ] = useState(currentQ);

  // Reconcile with the URL during render rather than in an effect — the back
  // button and "clear all" both change it from outside this component.
  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setSearch(currentQ);
  }

  const status = searchParams.get("status") ?? ALL;
  const assigneeId = searchParams.get("assigneeId") ?? ALL;
  const sort = searchParams.get("sort") ?? "-created_at";

  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === ALL) params.delete(key);
        else params.set(key, value);
      }

      // Any change to the result set invalidates the current page number.
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Debounced, so typing "westbridge" is one request rather than ten.
  useEffect(() => {
    if (search === currentQ) return;
    const timer = setTimeout(() => apply({ q: search || null }), 300);
    return () => clearTimeout(timer);
  }, [search, currentQ, apply]);

  const activeCount =
    (currentQ ? 1 : 0) + (status !== ALL ? 1 : 0) + (assigneeId !== ALL ? 1 : 0);

  const assigneeLabel =
    assigneeId === ALL
      ? null
      : assigneeId === "unassigned"
        ? "Unassigned"
        : (members.find((m) => m.id === assigneeId)?.fullName ?? null);

  return (
    <div className="space-y-3">
      {/* ----------------------------------------------- line 1: search */}
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by company, contact name or email"
          aria-label="Search leads"
          className="h-11 w-full bg-card pr-10 pl-10 text-sm"
        />
        {isPending && (
          <Loader2
            aria-hidden
            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {/* ------------------------- line 2: count left, controls right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={cn(
            "label-manifest shrink-0 transition-opacity",
            isPending && "opacity-50",
          )}
        >
          {total === 0
            ? "No leads match"
            : `${total} lead${total === 1 ? "" : "s"}`}
          {activeCount > 0 && " · filtered"}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="Filter by status"
            icon={SlidersHorizontal}
            label="Status"
            active={status !== ALL ? STATUS_LABELS[status as never] : null}
            value={status}
            onChange={(value) => apply({ status: value })}
            options={[
              { value: ALL, label: "Any status" },
              ...LEAD_STATUSES.map((value) => ({
                value,
                label: STATUS_LABELS[value],
              })),
            ]}
          />

          {/* Only admins can see other people's leads, so only admins get this. */}
          {canFilterByAssignee && (
            <FilterSelect
              ariaLabel="Filter by assignee"
              icon={SlidersHorizontal}
              label="Owner"
              active={assigneeLabel}
              value={assigneeId}
              onChange={(value) => apply({ assigneeId: value })}
              options={[
                { value: ALL, label: "Anyone" },
                { value: "unassigned", label: "Unassigned" },
                ...members.map((member) => ({
                  value: member.id,
                  label: member.fullName,
                })),
              ]}
            />
          )}

          <FilterSelect
            ariaLabel="Sort leads"
            icon={ArrowUpDown}
            label="Sort"
            // Sort always has a value, so it never counts as "filtered".
            active={null}
            value={sort}
            onChange={(value) => apply({ sort: value })}
            options={SORT_OPTIONS.map((option) => ({ ...option }))}
          />

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => apply({ q: null, status: null, assigneeId: null })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-status-lost/40 hover:text-status-lost"
            >
              <X className="size-3" aria-hidden />
              Clear
              <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-brass text-[0.625rem] text-brass-foreground">
                {activeCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A select whose trigger keeps its own name.
 *
 * Two things this does that a bare shadcn Select does not:
 *
 *  - the label is fixed, so the control still says what it filters once
 *    something is chosen. A dot marks it active, and the chosen value is in the
 *    title attribute rather than replacing the label.
 *  - SelectValue is given explicit children. Base UI resolves a value back to
 *    the text of a mounted item, so during a re-render it can fall through to
 *    printing the raw value — which is how a sort control ends up displaying
 *    "-created_at" to a salesperson.
 */
function FilterSelect({
  ariaLabel,
  icon: Icon,
  label,
  active,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  /** Human-readable current selection, or null when unfiltered. */
  active: string | null;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    // Base UI types the change value as `string | null`; these selects always
    // have a value, so a null simply means "no change".
    <Select
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        title={active ? `${label}: ${active}` : label}
        className={cn(
          "h-9 w-auto min-w-[7.5rem] gap-2 bg-card text-sm",
          active && "border-brass/50 text-foreground",
        )}
      >
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <SelectValue>
          <span className="flex items-center gap-1.5">
            {label}
            {active && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-brass"
              />
            )}
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
