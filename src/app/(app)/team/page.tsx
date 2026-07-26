import Link from "next/link";
import { notFound } from "next/navigation";

import { can } from "@/lib/permissions";
import { requireSessionOrRedirect } from "@/lib/server/dal";
import { getTeamWithWorkload } from "@/lib/server/lead-service";

export const metadata = { title: "Team" };

/**
 * Team directory — admin only, read-only.
 *
 * This route is the clearest demonstration of client-and-server permission
 * enforcement working together:
 *
 *   1. AppNav does not render a Team link for a member.
 *   2. If a member types /team anyway, this page refuses.
 *   3. If they call GET /api/members directly, the service returns 403.
 *
 * Each layer is independent. Removing any one of them would not open the other
 * two.
 *
 * It returns notFound() rather than a "forbidden" screen: a member has no
 * business learning that this route exists. The API is the opposite — a member
 * calling /api/members gets 403, because there they already know the team
 * exists, they simply may not enumerate it.
 */
export default async function TeamPage() {
  const session = await requireSessionOrRedirect();

  if (!can(session.user, "team:view")) {
    notFound();
  }

  const team = await getTeamWithWorkload(session);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who is on the desk, and what each person is carrying.
        </p>
      </header>

      <div className="glass-card overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="sr-only">
            Team members with their role and open lead count.
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-mono text-[0.625rem] font-normal tracking-[0.14em] text-muted-foreground uppercase"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-mono text-[0.625rem] font-normal tracking-[0.14em] text-muted-foreground uppercase"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-mono text-[0.625rem] font-normal tracking-[0.14em] text-muted-foreground uppercase"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-normal tracking-[0.14em] text-muted-foreground uppercase"
              >
                Open leads
              </th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr
                key={member.id}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-4 py-3 font-medium">
                  {member.fullName}
                  {member.id === session.user.id && (
                    <span className="ml-2 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {member.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      member.role === "admin"
                        ? "font-mono text-[0.6875rem] tracking-[0.12em] text-brass uppercase"
                        : "font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase"
                    }
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {member.openLeads > 0 ? (
                    <Link
                      href={`/leads?assigneeId=${member.id}`}
                      data-numeric
                      className="font-mono text-xs underline-offset-4 hover:text-brass hover:underline"
                    >
                      {member.openLeads}
                    </Link>
                  ) : (
                    <span data-numeric className="font-mono text-xs text-muted-foreground">
                      0
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Adding and removing users is out of scope for this build — accounts are
        provisioned by the seed script. A real implementation would also need to
        prevent demoting the last remaining admin.
      </p>
    </div>
  );
}
