-- Run in Supabase SQL Editor → Dashboard → SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE;
