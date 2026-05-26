-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Adds an admin-controlled do_not_email flag, separate from the user-controlled
-- email_unsubscribed flag. Use this for internal users, friends, family, or
-- test accounts that should never receive lifecycle emails.

ALTER TABLE users ADD COLUMN IF NOT EXISTS do_not_email BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_users_do_not_email ON users(do_not_email) WHERE do_not_email = TRUE;
