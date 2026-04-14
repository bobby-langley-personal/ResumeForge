-- Run in Supabase SQL Editor → Dashboard → SQL Editor

-- Track which lifecycle emails have been sent to each user (prevents duplicates)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'setup_experience',
    'first_tailor',
    'add_more_experience',
    'job_hunt_checkin',
    'try_extension'
  )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);

-- Track whether the user has ever made a request from the Chrome extension
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_used_extension BOOLEAN DEFAULT FALSE;
