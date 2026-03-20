-- Ensure content column is JSONB (not TEXT).
-- If it was created as TEXT, this converts it and preserves existing data.
-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → paste and run

ALTER TABLE resumes ALTER COLUMN content TYPE JSONB USING content::jsonb;
