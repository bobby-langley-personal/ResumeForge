-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Backfill chat_enabled for existing users:
-- All applications that existed before the free-tier gating feature launched
-- get chat access grandfathered in. chat_unlocked_count stays at 0 so each
-- user still gets their 3 free slots for future new generations.

UPDATE applications
SET chat_enabled = true
WHERE chat_enabled = false;
