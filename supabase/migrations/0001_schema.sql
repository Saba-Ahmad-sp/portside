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
