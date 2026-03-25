-- Add interview_prep column to applications table
-- Run in Supabase SQL editor → Dashboard → SQL Editor

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_prep jsonb;
