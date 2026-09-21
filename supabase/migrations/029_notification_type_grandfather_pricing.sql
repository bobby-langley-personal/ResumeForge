-- Adds 'grandfather_pricing' to the user_notifications CHECK constraint

ALTER TABLE user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;

ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_notification_type_check
  CHECK (notification_type IN (
    'setup_experience',
    'first_tailor',
    'add_more_experience',
    'job_hunt_checkin',
    'try_extension',
    'free_tier_update',
    'grandfather_pricing'
  ));
