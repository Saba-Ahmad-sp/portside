-- Portside: lead values are quoted in rupees, not dollars.
-- Run once against an already-provisioned database. A fresh clone gets the
-- correct column name straight from 0001_schema.sql and does not need this.
alter table public.leads rename column est_value_usd to est_value_inr;
