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

-- No DELETE policy anywhere: leads are retained by design. Revoking the grant
-- as well makes the intent explicit rather than implicit in a missing policy.
revoke delete on public.leads from anon, authenticated;

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

revoke update, delete on public.lead_notes from anon, authenticated;

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

revoke insert, update, delete on public.lead_activities from anon, authenticated;
