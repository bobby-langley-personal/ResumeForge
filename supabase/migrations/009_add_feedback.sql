-- Run in Supabase SQL editor → Dashboard → SQL Editor

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null check (type in ('general', 'bug')),
  message text not null,
  created_at timestamptz default now()
);

create index feedback_user_id_idx on feedback(user_id);
