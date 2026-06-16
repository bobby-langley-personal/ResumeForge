-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Adds app_version column to api_logs so every log entry records which
-- build of the app was running when the call was made.

ALTER TABLE api_logs
  ADD COLUMN IF NOT EXISTS app_version text;
