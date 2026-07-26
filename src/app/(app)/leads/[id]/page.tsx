import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { AssigneeControl } from "@/components/leads/assignee-control";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PipelineStepper } from "@/components/leads/pipeline-stepper";
import { StatusBadge } from "@/components/leads/status-badge";
import { ApiError } from "@/lib/api/responses";
import { formatAbsolute, formatQuantity, formatValue } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireSessionOrRedirect } from "@/lib/server/dal";
import {
  getActivities,
  getLead,
  getMembers,
  getNotes,
} from "@/lib/server/lead-service";
import { SOURCE_LABELS, type MemberDTO } from "@/lib/types";

/**
 * Lead detail — everything the brief's requirement (b) asks for in one place:
 * the status pipeline, assignment, timestamped notes, and the activity trail.
 *
 * The page renders on the server so the first paint is complete data, then the
 * four interactive panels take over as client components seeded with that same
 * data. No spinner on arrival, no refetch of what we already have.
 *
 * A lead this user may not see raises 404 in the service, and that becomes
 * Next's notFound() — the same answer a genuinely missing lead gives. A member
 * pasting a colleague's URL learns nothing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSessionOrRedirect();

  try {
    const lead = await getLead(session, id);
    return { title: lead.company };
  } catch {
    return { title: "Lead" };
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSessionOrRedirect();

  let lead;
  try {
    lead = await getLead(session, id);
  } catch (error) {
    // 404 covers both "no such lead" and "not yours to know about".
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const isAdmin = can(session.user, "lead:assign");

  const [notes, activities, members] = await Promise.all([
    getNotes(session, id),
    getActivities(session, id),
    isAdmin ? getMembers(session) : Promise.resolve<MemberDTO[]>([]),
  ]);

  const assignedTo = lead.assignee?.id ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-brass"
      >
        <ArrowLeft className="size-3" aria-hidden />
        All leads
      </Link>

      {/* ------------------------------------------------------------ head */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl">{lead.company}</h1>
            <StatusBadge status={lead.status} size="lg" />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {lead.fullName} · {lead.country}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-brass hover:underline"
            >
              <Mail className="size-3.5 text-muted-foreground" aria-hidden />
              {lead.email}
            </a>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 font-mono text-xs underline-offset-4 hover:text-brass hover:underline"
              >
                <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                {lead.phone}
              </a>
            )}
          </div>
        </div>

        <div className="w-full sm:w-56">
          <AssigneeControl
            leadId={lead.id}
            assignee={lead.assignee}
            viewer={session.user}
            members={members}
          />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* --------------------------------------------------------- left */}
        <div className="space-y-10">
          <PipelineStepper
            leadId={lead.id}
            status={lead.status}
            assignedTo={assignedTo}
            viewer={session.user}
          />

          {/* The enquiry itself, laid out like a manifest. */}
          <section aria-labelledby="enquiry-heading">
            <h2 id="enquiry-heading" className="label-manifest">
              Enquiry
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Fact label="Product interest" value={lead.productInterest} wide />
              <Fact label="Quantity" value={formatQuantity(lead.quantity)} mono />
              <Fact
                label="Est. value"
                value={formatValue(lead.estValueInr)}
                mono
              />
              <Fact label="Source" value={SOURCE_LABELS[lead.source]} />
              <Fact
                label="Received"
                value={formatAbsolute(lead.createdAt)}
                mono
              />
              <Fact
                label="Added by"
                value={lead.createdBy?.fullName ?? "Public form"}
              />
            </dl>

            {lead.message && (
              <blockquote className="mt-6 rounded-md border-l-2 border-brass/50 bg-card px-4 py-3.5 text-sm leading-relaxed">
                {lead.message}
              </blockquote>
            )}
          </section>

          <NotesPanel
            leadId={lead.id}
            assignedTo={assignedTo}
            viewer={session.user}
            initialNotes={notes}
          />
        </div>

        {/* -------------------------------------------------------- right */}
        <aside className="lg:border-l lg:border-border lg:pl-10">
          <ActivityTimeline leadId={lead.id} initialActivities={activities} />
        </aside>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="label-manifest">{label}</dt>
      <dd
        {...(mono ? { "data-numeric": true } : {})}
        className={mono ? "mt-1 font-mono text-sm" : "mt-1 text-sm"}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
