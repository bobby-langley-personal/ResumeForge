-- Add job_url column to applications table
-- Run in Supabase SQL editor → Dashboard → SQL Editor

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS job_url text;
