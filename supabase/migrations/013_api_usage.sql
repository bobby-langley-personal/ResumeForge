-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Tracks monthly API usage for rate-limited third-party services

create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  api_name text not null,
  month text not null, -- format: '2026-03'
  call_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(api_name, month)
);

create or replace function update_api_usage_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger api_usage_updated_at
  before update on api_usage
  for each row
  execute function update_api_usage_updated_at();
