-- Alma agents, drafts, critic reviews, signals, flywheel, schema proposals
-- Applied to Supabase: 2026-04-23

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent text not null check (agent in ('planner','researcher','correspondent','critic','watcher','curator')),
  triggered_by text check (triggered_by in ('cron','event','user_command','agent_dispatch')),
  input_summary jsonb,
  output_summary jsonb,
  duration_ms int,
  claude_tokens_used int,
  error text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_agent_runs_user_agent_time on agent_runs(user_id, agent, started_at desc);
create index if not exists idx_agent_runs_agent_time on agent_runs(agent, started_at desc);

create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  banker_id uuid references bankers(id),
  connection_id uuid references connections(id),
  type text not null check (type in ('cold','followup','reply','thank_you')),
  subject text,
  body text not null,
  guardrail_flags jsonb not null default '{}',
  status text not null check (status in ('pending_critic','needs_revision','approved','sent','skipped','edited_by_user','rejected_unresolvable')) default 'pending_critic',
  iteration_count int not null default 0,
  critic_review_id uuid,
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  sent_message_id text,
  user_edited_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drafts_user_status on drafts(user_id, status);
create index if not exists idx_drafts_scheduled on drafts(scheduled_send_at) where scheduled_send_at is not null and status = 'approved';

create table if not exists critic_reviews (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts(id) on delete cascade,
  scores jsonb not null,
  overall_score numeric not null,
  verdict text not null check (verdict in ('approve','reject','escalate_to_planner')),
  feedback text,
  suggested_revision text,
  created_at timestamptz not null default now()
);
create index if not exists idx_critic_reviews_draft on critic_reviews(draft_id);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  banker_id uuid references bankers(id),
  connection_id uuid references connections(id),
  draft_id uuid references drafts(id),
  agent text,
  signal_type text not null,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index if not exists idx_signals_type_time on signals(signal_type, occurred_at desc);
create index if not exists idx_signals_banker_type on signals(banker_id, signal_type);
create index if not exists idx_signals_user_time on signals(user_id, occurred_at desc);

create table if not exists scoring_weights (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  weights jsonb not null,
  produced_by text not null default 'weekly_batch',
  produced_at timestamptz not null default now(),
  is_active boolean not null default false
);
create unique index if not exists idx_scoring_weights_version on scoring_weights(version);
create index if not exists idx_scoring_weights_active on scoring_weights(is_active) where is_active = true;

create table if not exists critic_calibration (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  bucket_stats jsonb not null,
  axis_correlations jsonb not null,
  notes text,
  computed_at timestamptz not null default now()
);
create unique index if not exists idx_critic_calibration_version on critic_calibration(version);

create table if not exists flywheel_releases (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  headline text not null,
  changes jsonb not null,
  scoring_weights_version int,
  critic_calibration_version int,
  published_at timestamptz not null default now()
);
create index if not exists idx_flywheel_releases_week on flywheel_releases(week_of desc);

-- Schema proposals — Curator's DDL change requests, admin-gated for v1
create table if not exists schema_proposals (
  id uuid primary key default gen_random_uuid(),
  proposed_by text not null default 'curator',
  change_type text not null check (change_type in ('add_column','add_table','add_index','alter_column','drop_unused','other')),
  sql text not null,
  rationale text not null,
  status text not null check (status in ('pending','approved','rejected','executed','reverted')) default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS
alter table agent_runs enable row level security;
alter table drafts enable row level security;
alter table critic_reviews enable row level security;
alter table signals enable row level security;
alter table scoring_weights enable row level security;
alter table critic_calibration enable row level security;
alter table flywheel_releases enable row level security;
alter table schema_proposals enable row level security;

create policy "agent_runs_own" on agent_runs for select using (auth.uid() = user_id);
create policy "drafts_own" on drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "critic_reviews_via_draft" on critic_reviews for select using (exists (select 1 from drafts d where d.id = draft_id and d.user_id = auth.uid()));
create policy "signals_own" on signals for select using (auth.uid() = user_id);
create policy "scoring_weights_public_read" on scoring_weights for select using (auth.uid() is not null);
create policy "critic_calibration_public_read" on critic_calibration for select using (auth.uid() is not null);
create policy "flywheel_releases_public_read" on flywheel_releases for select using (auth.uid() is not null);
-- schema_proposals: admin/service_role only
