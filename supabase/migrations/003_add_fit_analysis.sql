-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → paste and run
alter table applications add column if not exists fit_analysis jsonb;