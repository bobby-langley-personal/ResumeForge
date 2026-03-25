-- Add chat_history column to applications table
-- Run in Supabase SQL editor → Dashboard → SQL Editor

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS chat_history jsonb;
