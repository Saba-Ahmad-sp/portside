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
