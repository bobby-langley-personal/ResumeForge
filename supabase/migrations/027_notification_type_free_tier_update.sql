-- Run in Supabase SQL Editor → Dashboard → SQL Editor
-- Adds 'free_tier_update' to the user_notifications CHECK constraint

-- Drop the old constraint (name is auto-generated from table + column)
ALTER TABLE user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;

-- Re-add with the new value included
ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_notification_type_check
  CHECK (notification_type IN (
    'setup_experience',
    'first_tailor',
    'add_more_experience',
    'job_hunt_checkin',
    'try_extension',
    'free_tier_update'
  ));
