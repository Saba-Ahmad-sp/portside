-- Portside: grants that were missing for the service_role.
-- Run this once in the Supabase SQL Editor.
grant usage on schema public to service_role;
grant all on public.profiles        to service_role;
grant all on public.leads           to service_role;
grant all on public.lead_notes      to service_role;
grant all on public.lead_activities to service_role;
