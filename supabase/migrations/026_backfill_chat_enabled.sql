-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Backfill chat_enabled for existing users:
-- Grant the 3 most recent applications per user chat access,
-- and set chat_unlocked_count to match.

-- Step 1: Enable chat on the 3 most recent applications per user
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM applications
)
UPDATE applications
SET chat_enabled = true
FROM ranked
WHERE applications.id = ranked.id
  AND ranked.rn <= 3;

-- Step 2: Set chat_unlocked_count to match how many were just enabled
WITH counts AS (
  SELECT user_id, COUNT(*) AS enabled_count
  FROM applications
  WHERE chat_enabled = true
  GROUP BY user_id
)
UPDATE users
SET chat_unlocked_count = LEAST(counts.enabled_count, 3)
FROM counts
WHERE users.id = counts.user_id;
