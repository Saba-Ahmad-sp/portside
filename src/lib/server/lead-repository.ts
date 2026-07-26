import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/responses";
import type { LeadQuery } from "@/lib/schemas/lead";
import type {
  ActivityDTO,
  ActorDTO,
  LeadDTO,
  LeadListItemDTO,
  MemberDTO,
  NoteDTO,
  Paginated,
} from "@/lib/types";

/**
 * Portside — repository layer.
 *
 * Database access and row -> DTO mapping. NOTHING ELSE. No authorisation, no
 * business rules, no HTTP. Those live in lead-service.ts, which is what makes
 * the service testable and the route handlers thin.
 *
 * Every function takes the caller's Supabase client rather than creating one,
 * so queries run as the signed-in user and Row Level Security applies. The
 * service never hands this layer the admin client.
 */

/* -------------------------------------------------------------------------- */
/*  Row shapes and mapping                                                     */
/* -------------------------------------------------------------------------- */

const LEAD_COLUMNS = `
  id, full_name, email, phone, company, country,
  product_interest, quantity, est_value_usd, message,
  source, status, created_at, updated_at,
  assignee:profiles!leads_assigned_to_fkey ( id, full_name ),
  creator:profiles!leads_created_by_fkey  ( id, full_name )
`;

type ProfileJoin = { id: string; full_name: string } | null;

type LeadRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string;
  country: string;
  product_interest: string | null;
  quantity: number | null;
  est_value_usd: number | string | null;
  message: string | null;
  source: LeadDTO["source"];
  status: LeadDTO["status"];
  created_at: string;
  updated_at: string;
  assignee: ProfileJoin;
  creator: ProfileJoin;
};

const toActor = (profile: ProfileJoin): ActorDTO =>
  profile ? { id: profile.id, fullName: profile.full_name } : null;

/** numeric columns come back as strings from PostgREST. */
const toNumber = (value: number | string | null): number | null =>
  value === null ? null : typeof value === "number" ? value : Number(value);

function toListItem(row: LeadRow): LeadListItemDTO {
  return {
    id: row.id,
    fullName: row.full_name,
    company: row.company,
    country: row.country,
    email: row.email,
    status: row.status,
    source: row.source,
    productInterest: row.product_interest,
    estValueUsd: toNumber(row.est_value_usd),
    assignee: toActor(row.assignee),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLead(row: LeadRow): LeadDTO {
  return {
    ...toListItem(row),
    phone: row.phone,
    quantity: row.quantity,
    message: row.message,
    createdBy: toActor(row.creator),
  };
}

/* -------------------------------------------------------------------------- */
/*  Leads                                                                      */
/* -------------------------------------------------------------------------- */

export async function listLeads(
  db: SupabaseClient,
  query: LeadQuery,
  opts: { restrictToAssignee?: string } = {},
): Promise<Paginated<LeadListItemDTO>> {
  const { page, limit, status, assigneeId, q, sort } = query;

  let builder = db
    .from("leads")
    .select(LEAD_COLUMNS, { count: "exact" });

  /**
   * RLS already limits a member to their own leads. We filter again here
   * because Supabase's own guidance is not to rely on policies alone to reduce
   * rows — the explicit predicate is what lets the planner use
   * leads_assigned_status_idx instead of filtering after the fact.
   */
  if (opts.restrictToAssignee) {
    builder = builder.eq("assigned_to", opts.restrictToAssignee);
  }

  if (status) builder = builder.eq("status", status);

  if (assigneeId === "unassigned") {
    builder = builder.is("assigned_to", null);
  } else if (assigneeId) {
    builder = builder.eq("assigned_to", assigneeId);
  }

  if (q) {
    // Commas and parentheses would break PostgREST's `or` grammar.
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) {
      builder = builder.or(
        `full_name.ilike.%${safe}%,company.ilike.%${safe}%,email.ilike.%${safe}%`,
      );
    }
  }

  const descending = sort.startsWith("-");
  const column = descending ? sort.slice(1) : sort;
  builder = builder.order(column, { ascending: !descending });

  const from = (page - 1) * limit;
  builder = builder.range(from, from + limit - 1);

  const { data, error, count } = await builder;
  if (error) throw new ApiError(500, "INTERNAL", error.message);

  const total = count ?? 0;
  return {
    data: (data as unknown as LeadRow[]).map(toListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Returns null when the lead does not exist OR the caller cannot see it — RLS
 * makes those indistinguishable, which is exactly what we want. The service
 * turns null into a 404 rather than a 403, so the API never confirms the
 * existence of a record the caller has no right to know about.
 */
export async function findLeadById(
  db: SupabaseClient,
  id: string,
): Promise<LeadDTO | null> {
  const { data, error } = await db
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return data ? toLead(data as unknown as LeadRow) : null;
}

/** Raw assignment lookup used for authorisation decisions before a full read. */
export async function findLeadAssignment(
  db: SupabaseClient,
  id: string,
): Promise<{ id: string; assignedTo: string | null; status: LeadDTO["status"] } | null> {
  const { data, error } = await db
    .from("leads")
    .select("id, assigned_to, status")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  if (!data) return null;
  return { id: data.id, assignedTo: data.assigned_to, status: data.status };
}

export async function insertLead(
  db: SupabaseClient,
  values: Record<string, unknown>,
): Promise<LeadDTO> {
  const { data, error } = await db
    .from("leads")
    .insert(values)
    .select(LEAD_COLUMNS)
    .single();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return toLead(data as unknown as LeadRow);
}

export async function updateLead(
  db: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<LeadDTO | null> {
  const { data, error } = await db
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select(LEAD_COLUMNS)
    .maybeSingle();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return data ? toLead(data as unknown as LeadRow) : null;
}

/**
 * Counts per pipeline stage, plus open value.
 *
 * Six indexed COUNT queries in parallel rather than pulling every row and
 * grouping in JavaScript. At demo scale the difference is invisible; at ten
 * thousand leads the second approach would ship ten thousand rows to compute
 * six numbers. leads_status_idx and leads_assigned_status_idx cover these.
 */
export async function leadStats(
  db: SupabaseClient,
  opts: { restrictToAssignee?: string } = {},
): Promise<{ byStatus: Record<LeadDTO["status"], number>; openValueUsd: number }> {
  const statuses: LeadDTO["status"][] = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
  ];

  const scoped = () => {
    const builder = db.from("leads");
    return opts.restrictToAssignee
      ? { builder, assignee: opts.restrictToAssignee }
      : { builder, assignee: undefined };
  };

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { builder, assignee } = scoped();
      let query = builder
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (assignee) query = query.eq("assigned_to", assignee);

      const { count, error } = await query;
      if (error) throw new ApiError(500, "INTERNAL", error.message);
      return [status, count ?? 0] as const;
    }),
  );

  // Value still in play — everything that is neither won nor lost.
  let openQuery = db
    .from("leads")
    .select("est_value_usd")
    .not("status", "in", "(won,lost)");
  if (opts.restrictToAssignee) {
    openQuery = openQuery.eq("assigned_to", opts.restrictToAssignee);
  }

  const { data: openRows, error: openError } = await openQuery;
  if (openError) throw new ApiError(500, "INTERNAL", openError.message);

  const openValueUsd = (openRows ?? []).reduce(
    (sum, row) => sum + (toNumber(row.est_value_usd) ?? 0),
    0,
  );

  return {
    byStatus: Object.fromEntries(counts) as Record<LeadDTO["status"], number>,
    openValueUsd,
  };
}

/* -------------------------------------------------------------------------- */
/*  Notes                                                                      */
/* -------------------------------------------------------------------------- */

const NOTE_COLUMNS = `id, body, created_at, author:profiles ( id, full_name )`;

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
  author: ProfileJoin;
};

export async function listNotes(
  db: SupabaseClient,
  leadId: string,
): Promise<NoteDTO[]> {
  const { data, error } = await db
    .from("lead_notes")
    .select(NOTE_COLUMNS)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return (data as unknown as NoteRow[]).map((row) => ({
    id: row.id,
    body: row.body,
    author: toActor(row.author),
    createdAt: row.created_at,
  }));
}

export async function insertNote(
  db: SupabaseClient,
  leadId: string,
  authorId: string,
  body: string,
): Promise<NoteDTO> {
  const { data, error } = await db
    .from("lead_notes")
    .insert({ lead_id: leadId, author_id: authorId, body })
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  const row = data as unknown as NoteRow;
  return {
    id: row.id,
    body: row.body,
    author: toActor(row.author),
    createdAt: row.created_at,
  };
}

/* -------------------------------------------------------------------------- */
/*  Activities                                                                 */
/* -------------------------------------------------------------------------- */

type ActivityRow = {
  id: string;
  type: ActivityDTO["type"];
  from_value: string | null;
  to_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: ProfileJoin;
};

export async function listActivities(
  db: SupabaseClient,
  leadId: string,
): Promise<ActivityDTO[]> {
  const { data, error } = await db
    .from("lead_activities")
    .select(
      `id, type, from_value, to_value, metadata, created_at, actor:profiles ( id, full_name )`,
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return (data as unknown as ActivityRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    actor: toActor(row.actor),
    fromValue: row.from_value,
    toValue: row.to_value,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Members                                                                    */
/* -------------------------------------------------------------------------- */

export async function listMembers(db: SupabaseClient): Promise<MemberDTO[]> {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
  }));
}

/**
 * Open lead count per member, for the team page.
 *
 * One indexed COUNT per member in parallel rather than fetching every lead and
 * tallying in JavaScript. leads_assigned_status_idx covers exactly this shape.
 */
export async function memberWorkload(
  db: SupabaseClient,
  memberIds: string[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    memberIds.map(async (id) => {
      const { count, error } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", id)
        .not("status", "in", "(won,lost)");

      if (error) throw new ApiError(500, "INTERNAL", error.message);
      return [id, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function memberExists(
  db: SupabaseClient,
  id: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new ApiError(500, "INTERNAL", error.message);
  return data !== null;
}
