-- ===========================================================================
-- Portside — 0005_value_activity.sql
-- Record changes to a lead's estimated value in the activity trail.
--
-- The estimated value is the sales team's judgement, not something the buyer
-- declares — the public capture form deliberately does not ask for it. It is
-- set once someone has qualified the enquiry, and revised as they learn more.
--
-- That makes it exactly the kind of field an audit trail exists for: "who
-- decided this deal was worth three times what we first thought, and when" is
-- a question a sales manager actually asks. Assignment and status changes are
-- already logged; a silent change to the number the forecast is built on
-- would be the conspicuous omission.
--
-- NOTE: run this statement on its own. PostgreSQL will not add a value to an
-- enum inside a transaction block that also uses it.
-- ===========================================================================

alter type public.activity_type add value if not exists 'value_changed';
