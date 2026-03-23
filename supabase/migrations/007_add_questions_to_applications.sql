-- Add application questions columns to applications table
-- Run in Supabase SQL editor → Dashboard → SQL Editor

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS questions jsonb,
  ADD COLUMN IF NOT EXISTS question_answers jsonb;
