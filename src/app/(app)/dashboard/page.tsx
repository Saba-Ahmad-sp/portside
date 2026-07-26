import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/leads/status-badge";
import { formatRelative, formatValue } from "@/lib/format";
import { PIPELINE, can } from "@/lib/permissions";
import { leadQuerySchema } from "@/lib/schemas/lead";
import { requireSessionOrRedirect } from "@/lib/server/dal";
import { getLeads, getStats } from "@/lib/server/lead-service";
import { STATUS_LABELS } from "@/lib/types";

export const metadata = { title: "Overview" };

/**
 * Overview.
 *
 * Scoped to whatever the viewer is allowed to see — an admin gets the whole
 * desk, a member gets their own book — using the same permission check as
 * every other read. There is no separate "admin dashboard"; there is one
 * dashboard that tells you the truth about your own access.
 */
export default async function DashboardPage() {
  const session = await requireSessionOrRedirect();
  const isAdmin = can(session.user, "lead:list:all");

  const [stats, recent] = await Promise.all([
    getStats(session),
    getLeads(session, leadQuerySchema.parse({ limit: "6" })),
  ]);

  const open = PIPELINE.reduce(
    (sum, stage) => (stage === "won" ? sum : sum + stats.byStatus[stage]),
    0,
  );

  const closed = stats.byStatus.won + stats.byStatus.lost;
  const winRate =
    closed === 0 ? null : Math.round((stats.byStatus.won / closed) * 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl">
          {greeting()}, {session.user.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "The whole desk at a glance."
            : "Your book of enquiries at a glance."}
        </p>
      </header>

      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Open leads"
          value={open}
          caption="Still in the pipeline"
          href="/leads"
        />
        <StatTile
          label="Open value"
          value={formatValue(stats.openValueInr)}
          caption="Estimated, excluding won and lost"
          accentClassName="text-brass"
        />
        <StatTile
          label="Won"
          value={stats.byStatus.won}
          caption="Closed successfully"
          href="/leads?status=won"
          accentClassName="text-status-won"
        />
        <StatTile
          label="Win rate"
          value={winRate === null ? "—" : `${winRate}%`}
          caption={
            closed === 0 ? "Nothing closed yet" : `Across ${closed} closed leads`
          }
        />
      </div>

      {/* Pipeline breakdown — each stage links to that filtered view. */}
      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="label-manifest">
          Pipeline
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(["new", "contacted", "qualified", "proposal", "won", "lost"] as const).map(
            (stage) => (
              <StatTile
                key={stage}
                label={STATUS_LABELS[stage]}
                value={stats.byStatus[stage]}
                href={`/leads?status=${stage}`}
                accentClassName={`text-status-${stage}`}
              />
            ),
          )}
        </div>
      </section>

      {/* Most recent activity on the desk */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="label-manifest">
            Latest enquiries
          </h2>
          <Link
            href="/leads"
            className="group inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-brass"
          >
            All leads
            <ArrowRight
              className="size-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <ul className="glass-card mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {recent.data.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {lead.company}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {lead.country} · {lead.productInterest ?? "No product noted"}
                  </span>
                </span>
                <StatusBadge status={lead.status} />
                <span
                  data-numeric
                  className="w-20 text-right font-mono text-[0.6875rem] text-muted-foreground"
                >
                  {formatRelative(lead.createdAt).replace(" ago", "")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
