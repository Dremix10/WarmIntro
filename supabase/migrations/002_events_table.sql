-- Events table for security logging (honeypot hits, suspicious activity)
-- No RLS — server-side inserts only via anon key with permissive insert policy

create table events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  ip text,
  user_agent text,
  headers jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_events_type on events(event_type);
create index idx_events_ip on events(ip);
create index idx_events_created on events(created_at);

-- RLS: allow inserts from anon key (server-side), deny reads from client
alter table events enable row level security;

create policy "Allow server inserts"
  on events for insert
  with check (true);

-- No select/update/delete policies — data is write-only from the app's perspective
