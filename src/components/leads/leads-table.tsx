import Link from "next/link";
import { Inbox, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/leads/status-badge";
import { formatRelative, formatValueCompact } from "@/lib/format";
import type { LeadListItemDTO } from "@/lib/types";

/**
 * The leads table.
 *
 * Presentational and server-rendered — it takes rows and draws them. Filtering,
 * sorting and paging all happen in the URL and are resolved on the server, so
 * this component has no state and ships no JavaScript.
 *
 * Styled as a ruled ledger rather than a card grid: hairline rows, mono for
 * anything scanned down a column, and a single status dot per row instead of a
 * wall of coloured pills.
 */
export function LeadsTable({
  leads,
  isFiltered,
}: {
  leads: LeadListItemDTO[];
  isFiltered: boolean;
}) {
  if (leads.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={SearchX}
        title="Nothing matches those filters"
        description="Try widening the search, or clear the filters to see the whole desk."
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title="No leads yet"
        description="Enquiries submitted through the public form will land here, unassigned and timestamped."
      />
    );
  }

  return (
    <div className="glass-card overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">
          Leads, with company, destination, product interest, estimated value,
          pipeline status and owner.
        </caption>

        <thead>
          <tr className="border-b border-border">
            <Th className="w-[26%]">Company</Th>
            <Th className="w-[14%]">Destination</Th>
            <Th className="w-[22%]">Product interest</Th>
            <Th className="w-[10%] text-right">Value</Th>
            <Th className="w-[12%]">Status</Th>
            <Th className="w-[10%]">Owner</Th>
            <Th className="w-[6%] text-right">Age</Th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="group border-b border-border/70 last:border-0 transition-colors hover:bg-accent/40"
            >
              <td className="px-4 py-3">
                {/* The whole row is reachable from one link, so keyboard users
                    tab once per lead rather than once per cell. */}
                <Link
                  href={`/leads/${lead.id}`}
                  className="block rounded-sm focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
                >
                  <span className="block font-medium group-hover:text-brass">
                    {lead.company}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {lead.fullName}
                  </span>
                </Link>
              </td>

              <td className="px-4 py-3 text-muted-foreground">{lead.country}</td>

              <td className="px-4 py-3">
                <span className="line-clamp-1 text-muted-foreground">
                  {lead.productInterest ?? "—"}
                </span>
              </td>

              <td
                data-numeric
                className="px-4 py-3 text-right font-mono text-xs"
              >
                {formatValueCompact(lead.estValueInr)}
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>

              <td className="px-4 py-3">
                {lead.assignee ? (
                  <span className="text-xs">{lead.assignee.fullName}</span>
                ) : (
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/70">
                    Unassigned
                  </span>
                )}
              </td>

              <td
                data-numeric
                className="px-4 py-3 text-right font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground"
                title={lead.createdAt}
              >
                {formatRelative(lead.createdAt).replace(" ago", "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left font-mono text-[0.625rem] font-normal uppercase tracking-[0.14em] text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
