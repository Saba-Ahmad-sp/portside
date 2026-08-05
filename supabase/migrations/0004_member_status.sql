-- ===========================================================================
-- Portside — 0004_member_status.sql
-- Let admins deactivate and restore a colleague's access.
--
-- profiles.is_active already existed and was already enforced everywhere that
-- matters: can() refuses every action for an inactive user, and the DAL treats
-- an inactive session as unauthenticated. What was missing was any way to set
-- it — the column was enforced but unreachable.
--
-- The privilege is deliberately column-scoped. An admin may change is_active
-- and nothing else, so this cannot become a route to editing roles: promoting
-- someone to admin is a different decision with different consequences, and it
-- would be a mistake to smuggle it in behind an "access" toggle.
-- ===========================================================================

grant update (is_active) on public.profiles to authenticated;

create policy "profiles: admins set access"
  on public.profiles
  for update
  to authenticated
  using      ( (select private.is_admin()) )
  with check ( (select private.is_admin()) );

comment on column public.profiles.is_active is
  'False revokes access. Enforced at three layers: can() returns false for '
  'every action, the DAL rejects the session as unauthenticated, and the '
  'policies above only let an admin change it.';
