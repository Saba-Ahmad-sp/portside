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
