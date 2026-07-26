import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { can } from "@/lib/permissions";
import { leadQuerySchema } from "@/lib/schemas/lead";
import { requireSessionOrRedirect } from "@/lib/server/dal";
import { getLeads, getMembers } from "@/lib/server/lead-service";
import type { MemberDTO } from "@/lib/types";

export const metadata = { title: "Leads" };

/**
 * The leads desk.
 *
 * A Server Component that calls the service layer directly — no internal HTTP
 * hop to its own API. The route handlers exist as a second doorway into the
 * same service for API clients and tests; a Server Component fetching its own
 * endpoint would just be a wasted round trip.
 *
 * Filter, sort, search and page all live in the URL, so this component is a
 * pure function of `searchParams`. Changing a filter pushes a new URL, this
 * re-runs, fresh rows come back. No client-side list state to keep in sync.
 */
export default async function LeadsPage({
  searchParams,
}: {
  // Async in Next.js 16.
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSessionOrRedirect();
  const params = await searchParams;

  // Invalid parameters fall back to defaults rather than erroring — a hand-
  // edited URL should not break the page.
  const parsed = leadQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : leadQuerySchema.parse({});

  const isAdmin = can(session.user, "lead:list:all");

  const [result, members] = await Promise.all([
    getLeads(session, query),
    isAdmin ? getMembers(session) : Promise.resolve<MemberDTO[]>([]),
  ]);

  const isFiltered = Boolean(params.q || params.status || params.assigneeId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Every enquiry on the desk."
              : "Enquiries assigned to you."}
          </p>
        </div>
      </header>

      <LeadFilters
        members={members}
        canFilterByAssignee={isAdmin}
        total={result.meta.total}
      />

      <LeadsTable leads={result.data} isFiltered={isFiltered} />

      <PaginationBar meta={result.meta} searchParams={params} />
    </div>
  );
}
