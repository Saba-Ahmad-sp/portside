-- ===========================================================================
-- PORTSIDE - COMPLETE DATABASE SETUP
--
-- Paste this ENTIRE file into the Supabase SQL Editor and click Run.
-- It is the three migration files in supabase/migrations/ concatenated in
-- order (0001 schema -> 0002 functions -> 0003 rls). Safe to run once on a
-- brand new project.
-- ===========================================================================

-- ===========================================================================
-- Portside — 0001_schema.sql
-- Enums, tables, foreign keys, indexes.
--
-- Design notes (expanded in README "Data model decisions"):
--   * Status is a Postgres ENUM, not text — an invalid status is rejected by
--     the database, not only by the form.
--   * Activities live in their own table, not a jsonb column on leads, so they
--     can be paginated, filtered by actor, and indexed independently.
--   * actor_id / created_by are NULLABLE — a lead submitted through the public
--     form has no logged-in actor.
--   * assigned_to is ON DELETE SET NULL: removing a salesperson must not delete
--     the leads or notes they touched. Notes/activities CASCADE with the lead.
--   * There is no DELETE path for leads by design. A CRM that hard-deletes
--     leads destroys its own audit trail; admins mark a lead 'lost' instead.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type public.user_role     as enum ('admin', 'member');
create type public.lead_source   as enum ('website', 'manual', 'referral');
create type public.lead_status   as enum ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');
create type public.activity_type as enum (
  'lead_created',
  'assigned',
  'unassigned',
  'status_changed',
  'note_added'
);

-- --------------------------------------------------------------------------
-- profiles — application-level user record, 1:1 with auth.users
-- --------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null,
  email       text        not null,
  role        public.user_role not null default 'member',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Staff directory for the single Portside organisation. One row per auth user.';

-- --------------------------------------------------------------------------
-- leads
-- --------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),

  -- who enquired
  full_name         text not null,
  email             text not null,
  phone             text,
  company           text not null,
  country           text not null,

  -- what they want (export/import enquiry)
  product_interest  text,
  quantity          integer,
  est_value_inr     numeric(12, 2),
  message           text,

  -- pipeline
  source            public.lead_source not null default 'website',
  status            public.lead_status not null default 'new',
  assigned_to       uuid references public.profiles (id) on delete set null,
  created_by        uuid references public.profiles (id) on delete set null,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint leads_quantity_positive  check (quantity is null or quantity > 0),
  constraint leads_value_nonnegative  check (est_value_inr is null or est_value_inr >= 0),
  constraint leads_email_shape        check (position('@' in email) > 1)
);

comment on column public.leads.created_by is
  'NULL for leads submitted through the public capture form.';

-- --------------------------------------------------------------------------
-- lead_notes — human-written, timestamped
-- --------------------------------------------------------------------------
create table public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id)    on delete cascade,
  author_id   uuid          references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now(),

  constraint lead_notes_body_not_blank check (length(btrim(body)) > 0)
);

-- --------------------------------------------------------------------------
-- lead_activities — machine-written audit trail
--
-- Rows here are ONLY ever written server-side by the activity service using
-- the service role. There is deliberately no INSERT policy for anon or
-- authenticated (see 0003_rls.sql), so a client cannot forge history.
-- --------------------------------------------------------------------------
create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id)    on delete cascade,
  actor_id    uuid          references public.profiles (id) on delete set null,
  type        public.activity_type not null,
  from_value  text,
  to_value    text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on column public.lead_activities.actor_id is
  'NULL means the system acted — e.g. a lead created from the public form.';

-- --------------------------------------------------------------------------
-- Indexes
--
-- Every column referenced by an RLS policy is indexed. Supabase documents
-- >100x improvements from this on policy columns.
-- --------------------------------------------------------------------------
create index leads_assigned_to_idx        on public.leads (assigned_to);
create index leads_status_idx             on public.leads (status);
create index leads_created_at_idx         on public.leads (created_at desc);
create index leads_assigned_status_idx    on public.leads (assigned_to, status);

create index lead_notes_lead_id_idx       on public.lead_notes (lead_id, created_at desc);
create index lead_activities_lead_id_idx  on public.lead_activities (lead_id, created_at desc);

create index profiles_role_idx            on public.profiles (role);

-- Case-insensitive search across the fields the ?q= filter targets.
create index leads_search_idx on public.leads
  using gin (to_tsvector('simple',
    coalesce(full_name, '') || ' ' ||
    coalesce(company, '')   || ' ' ||
    coalesce(email, '')
  ));



-- ===========================================================================
-- Portside — 0002_functions.sql
-- Security-definer helpers and triggers.
--
-- SECURITY DEFINER functions run with the privileges of their owner. Every one
-- below pins `search_path = ''` and schema-qualifies every reference, which is
-- what stops a caller shadowing a table name to hijack execution inside a
-- privileged function. Both PostgreSQL and Supabase document this as required.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- A schema that is NOT exposed through PostgREST.
--
-- Helpers used by RLS policies live here so they can never be invoked as
-- /rest/v1/rpc/<name> by a client. RLS policies run inside the database and
-- can still call them.
-- --------------------------------------------------------------------------
-- PostgREST only exposes the schemas listed in its config (public,
-- graphql_public). `private` is not among them, so nothing here is reachable
-- as /rest/v1/rpc/<name>. USAGE + EXECUTE must still be granted to
-- `authenticated`, because PostgreSQL checks function privileges against the
-- calling role when it evaluates an RLS policy expression.
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, authenticated, service_role;

-- --------------------------------------------------------------------------
-- private.is_admin()
--
-- Called by nearly every RLS policy. Doing this as a SECURITY DEFINER function
-- instead of joining public.profiles inside each policy avoids re-running a
-- correlated subquery per row — Supabase benchmarks this pattern at
-- 178,000 ms -> 12 ms on a large table.
--
-- STABLE so the planner can cache it within a statement.
-- --------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to postgres, authenticated, service_role;

comment on function private.is_admin() is
  'True when the current session belongs to an active admin. Used by RLS policies only.';

-- --------------------------------------------------------------------------
-- private.owns_lead(uuid)
--
-- True when the current user is the assignee of the given lead. Used by the
-- notes and activities policies so they inherit lead visibility instead of
-- restating it.
-- --------------------------------------------------------------------------
create or replace function private.owns_lead(p_lead_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.leads
    where id = p_lead_id
      and assigned_to = (select auth.uid())
  );
$$;

revoke all on function private.owns_lead(uuid) from public;
grant execute on function private.owns_lead(uuid) to postgres, authenticated, service_role;

-- --------------------------------------------------------------------------
-- public.handle_new_user()
--
-- Creates the profile row whenever an auth user is created, so profiles and
-- auth.users can never drift apart. Role is read from user metadata, which is
-- how the seed script provisions admins; anything else defaults to 'member'.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'member'::public.user_role
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- public.handle_updated_at()
--
-- leads.updated_at is maintained by the database, not by application code, so
-- it cannot be forgotten or spoofed by a client.
-- --------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.handle_updated_at();



-- ===========================================================================
-- Portside — 0003_rls.sql
-- Row Level Security. This is the third and last enforcement layer.
--
-- Layer 1  UI          hides actions the user cannot perform
-- Layer 2  Service     re-checks can() before every operation  <- real boundary
-- Layer 3  RLS         rejects unauthorised rows even if 1 and 2 were bypassed
--
-- Performance rules applied throughout, all measured by Supabase:
--   * (select auth.uid()) never a bare auth.uid() — the subselect becomes an
--     initPlan that is evaluated once per statement instead of once per row
--     (179 ms -> 9 ms in Supabase's benchmark).
--   * TO authenticated on every policy — anonymous sessions skip evaluation
--     entirely rather than evaluating and failing.
--   * private.is_admin() instead of joining profiles inside each policy.
--   * Every column referenced by a policy is indexed (see 0001).
--
-- WITH CHECK is written out explicitly on every UPDATE policy. PostgreSQL
-- falls back to the USING expression when WITH CHECK is omitted, so this is
-- not strictly required — it is here so the intended write constraint is
-- legible without the reader having to know that fallback rule.
-- ===========================================================================

alter table public.profiles        enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_notes      enable row level security;
alter table public.lead_activities enable row level security;

-- ---------------------------------------------------------------------------
-- TABLE PRIVILEGES — least privilege, declared explicitly.
--
-- This project is created with Supabase's "Automatically expose new tables"
-- setting OFF, which is what Supabase itself recommends. Nothing is reachable
-- through the Data API unless it is granted here, in a migration, in version
-- control. Privileges are part of the security posture, so they belong in the
-- repo rather than in a dashboard toggle.
--
-- Two independent gates have to agree before a row is returned:
--   GRANT decides whether the role may touch the table at all
--   POLICY decides which rows, and what they may become
--
-- `anon` is granted nothing anywhere. An anonymous visitor has no database
-- access of any kind; the public capture form is mediated by the server.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated, service_role;

-- What a signed-in staff member may reach. RLS then decides which rows.
grant select                 on public.profiles        to authenticated;
grant select, insert, update on public.leads           to authenticated;
grant select, insert         on public.lead_notes      to authenticated;
grant select                 on public.lead_activities to authenticated;

-- The trusted server identity. It bypasses RLS, but with "expose new tables"
-- disabled it still needs table privileges granted explicitly. Used only by
-- the activity service, the public capture endpoint, and the seed script.
grant all on public.profiles        to service_role;
grant all on public.leads           to service_role;
grant all on public.lead_notes      to service_role;
grant all on public.lead_activities to service_role;

-- Note what is absent and why:
--   leads           no DELETE   — leads are retained by design
--   lead_notes      no UPDATE/DELETE — notes are append-only
--   lead_activities no INSERT/UPDATE/DELETE — the audit trail is written only
--                   by the service role, so no client can forge history
--   profiles        no INSERT/UPDATE — profiles are created by the signup
--                   trigger, so a member cannot promote themselves to admin

-- ---------------------------------------------------------------------------
-- ANONYMOUS ACCESS: NONE.
--
-- The public capture form does NOT write to the database from the browser.
-- It POSTs to /api/public/leads, which validates with Zod and inserts
-- server-side. So `anon` needs no policy on any table and gets none — there is
-- no anonymous read or write path into the data at all.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- profiles
--
-- Any signed-in staff member may read the colleague directory (name, work
-- email, role) — this is a single-organisation CRM and those are not secrets.
-- Note this is NOT the same as being allowed to call GET /api/members, which
-- is admin-only at the service layer.
--
-- There is no INSERT policy: profiles are created exclusively by the
-- on_auth_user_created trigger. There is no UPDATE policy: nothing in the app
-- edits profiles, so a member cannot promote themselves to admin.
-- ---------------------------------------------------------------------------
create policy "profiles: staff can read the directory"
  on public.profiles
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create policy "leads: admins read all, members read assigned"
  on public.leads
  for select
  to authenticated
  using (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
  );

create policy "leads: staff can create, attributed to themselves"
  on public.leads
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
  );

create policy "leads: admins update all, members update assigned"
  on public.leads
  for update
  to authenticated
  using (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
  )
  with check (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
  );

-- No DELETE policy and no DELETE grant: leads are retained by design.
-- Both gates say no, so this is not an oversight that a future grant could
-- silently undo.

-- ---------------------------------------------------------------------------
-- lead_notes
--
-- Visibility is inherited from the parent lead via private.owns_lead(), so the
-- rule is stated once rather than duplicated here.
-- Notes are append-only: no UPDATE or DELETE policy.
-- ---------------------------------------------------------------------------
create policy "lead_notes: readable with the parent lead"
  on public.lead_notes
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.owns_lead(lead_id))
  );

create policy "lead_notes: authors write on leads they can see"
  on public.lead_notes
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (select private.is_admin())
      or (select private.owns_lead(lead_id))
    )
  );

-- Append-only: no UPDATE/DELETE policy and no UPDATE/DELETE grant.

-- ---------------------------------------------------------------------------
-- lead_activities
--
-- SELECT only. There is deliberately no INSERT/UPDATE/DELETE policy for anon
-- or authenticated, so no client can forge, edit or erase history. The trail
-- is written exclusively by the activity service using the service role, which
-- bypasses RLS. An audit trail a user can write to is not an audit trail.
-- ---------------------------------------------------------------------------
create policy "lead_activities: readable with the parent lead"
  on public.lead_activities
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.owns_lead(lead_id))
  );

-- Write-protected: no INSERT/UPDATE/DELETE policy and no such grant. The trail
-- is written exclusively by the service role, which bypasses both gates.

