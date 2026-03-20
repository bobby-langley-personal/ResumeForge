-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → paste and run

-- Add is_default flag so one resume can auto-populate the home page
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Add item_type so users can categorize artifacts
-- 'resume' | 'cover_letter' | 'portfolio' | 'other'
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'resume'
  CHECK (item_type IN ('resume', 'cover_letter', 'portfolio', 'other'));

-- Only one default per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_one_default_per_user
  ON resumes (user_id)
  WHERE is_default = TRUE;

-- Index for faster library page queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_created ON resumes (user_id, created_at DESC);
