-- Run in Supabase SQL editor → Dashboard → SQL Editor

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  status text not null default 'draft' check (status in ('draft', 'complete')),
  completed_roles jsonb not null default '[]',
  draft_state jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index interview_sessions_user_id_idx on interview_sessions(user_id);

-- Auto-update updated_at on row change
create or replace function update_interview_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger interview_sessions_updated_at
  before update on interview_sessions
  for each row execute function update_interview_sessions_updated_at();
