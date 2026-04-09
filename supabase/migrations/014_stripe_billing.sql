-- Run in Supabase SQL Editor → Dashboard → SQL Edito
-- Adds Stripe billing columns to the users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'canceled')),
  ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS tailored_resume_count integer DEFAULT 0 NOT NULL;
