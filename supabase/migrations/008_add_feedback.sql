-- Run in Supabase SQL editor → Dashboard → SQL Editor
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('general', 'bug')),
  message text not null,
  is_anonymous boolean default true,
  user_id text,              -- null if anonymous
  user_name text,            -- null if anonymous
  steps_to_reproduce text,   -- bug reports only
  what_happened text,        -- bug reports only
  created_at timestamptz default now()
);
