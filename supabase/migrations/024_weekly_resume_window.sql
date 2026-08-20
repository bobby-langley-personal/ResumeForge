-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Adds rolling 7-day resume window tracking to the users table.
-- window_start: timestamp of the first resume generated in the current 7-day period.
-- weekly_resume_count: number of resumes generated in the current window.
-- tailored_resume_count is kept as a lifetime stat for admin visibility.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weekly_resume_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_window_start TIMESTAMPTZ;
