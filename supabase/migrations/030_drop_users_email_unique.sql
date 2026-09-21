-- Drop the UNIQUE constraint on users.email.
--
-- This constraint was inherited from the original Supabase Auth design where
-- email was the login identifier. The app now uses Clerk for auth, where id is
-- the identity and Clerk itself deduplicates emails within an instance.
-- The constraint is redundant and causes silent failures in UserSync when two
-- Clerk accounts share the same primary email (e.g. OAuth accounts).

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
