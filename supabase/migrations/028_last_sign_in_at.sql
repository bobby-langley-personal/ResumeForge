-- Run in Supabase SQL Editor → Dashboard → SQL Editor
-- Tracks the last time each user loaded an authenticated page
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
