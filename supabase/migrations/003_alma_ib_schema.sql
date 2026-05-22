-- Alma IB schema — bank hierarchy, LinkedIn profiles, deals, trust levels, profile+connection extensions
-- Applied to Supabase: 2026-04-23
-- Safe to re-run (idempotent: create-if-not-exists + alter add-if-not-exists)

-- Bank hierarchy
create table if not exists firms (
  id text primary key,
  name text not null,
  tier text not null check (tier in ('bulge_bracket','elite_boutique','middle_market')),
  logo_url text,
  domain text not null,
  hq_city text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id text primary key,
  firm_id text not null references firms(id) on delete cascade,
  name text not null,
  kind text check (kind in ('coverage','product','region')),
  parent_group_id text references groups(id)
);

create table if not exists bankers (
  id uuid primary key default gen_random_uuid(),
  firm_id text references firms(id),
  group_id text references groups(id),
  name text not null,
  title text not null,
  seniority text check (seniority in ('analyst','associate','vp','director','md')),
  grad_year int,
  university text,
  linkedin_url text,
  email text,
  email_verified boolean not null default false,
  source text check (source in ('hunter','serper','rice_directory','brown_directory','user_added','manual_seed','proxycurl','curator')) default 'manual_seed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bankers_firm_group on bankers(firm_id, group_id);
create index if not exists idx_bankers_university on bankers(university);
create index if not exists idx_bankers_email on bankers(email) where email is not null;

-- LinkedIn profile enrichment
create table if not exists banker_profiles (
  banker_id uuid primary key references bankers(id) on delete cascade,
  education jsonb not null default '[]',
  past_positions jsonb not null default '[]',
  about_section text,
  recent_posts jsonb not null default '[]',
  recent_deals_mentioned jsonb not null default '[]',
  volunteering jsonb not null default '[]',
  languages text[] not null default '{}',
  certifications jsonb not null default '[]',
  interests text[] not null default '{}',
  scraped_at timestamptz,
  scrape_source text check (scrape_source in ('proxycurl','serper','manual'))
);

-- Deal tracker
create table if not exists banker_deals (
  id uuid primary key default gen_random_uuid(),
  banker_id uuid references bankers(id) on delete cascade,
  deal_name text not null,
  target_company text,
  acquirer_company text,
  value_usd bigint,
  closed_on date,
  description text,
  source text check (source in ('seed','mergermarket','press','banker_linkedin','user_reply_extraction','watcher_signal','curator')) default 'seed',
  confidence float not null default 0.7,
  added_at timestamptz not null default now()
);
create index if not exists idx_banker_deals_banker on banker_deals(banker_id);

-- Profile extensions (IB-specific)
alter table profiles add column if not exists target_firms text[] not null default '{}';
alter table profiles add column if not exists target_groups text[] not null default '{}';
alter table profiles add column if not exists warm_hints text[] not null default '{}';
alter table profiles add column if not exists story_one_liner text;
alter table profiles add column if not exists gmail_refresh_token_encrypted text;
alter table profiles add column if not exists gmail_access_token_encrypted text;
alter table profiles add column if not exists gmail_token_expires_at timestamptz;
alter table profiles add column if not exists gmail_scopes text[];
alter table profiles add column if not exists gmail_connected_at timestamptz;
alter table profiles add column if not exists gmail_email text;

-- Connection extensions (7-stage IB pipeline)
alter table connections add column if not exists banker_id uuid references bankers(id);
alter table connections add column if not exists warmth numeric;
alter table connections add column if not exists last_send_message_id text;
alter table connections add column if not exists thread_id text;
alter table connections add column if not exists silence_days int not null default 0;
alter table connections add column if not exists needs_followup boolean not null default false;
alter table connections drop constraint if exists connections_stage_check;
alter table connections add constraint connections_stage_check check (stage in ('sent','replied','coffee','referral','first_round','superday','offer','closed_lost'));

-- Trust gradient state
create table if not exists trust_levels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  send_new_email text not null check (send_new_email in ('C','B','A')) default 'C',
  send_followup text not null check (send_followup in ('C','B','A')) default 'C',
  send_reply text not null check (send_reply in ('C','B','A')) default 'C',
  approvals_count_new int not null default 0,
  approvals_count_followup int not null default 0,
  approvals_count_reply int not null default 0,
  stops_count int not null default 0,
  auto_graduate boolean not null default true,
  preferred_send_time time not null default '07:00',
  preferred_timezone text not null default 'America/New_York',
  night_preview_enabled boolean not null default true,
  tomorrow_override jsonb,
  updated_at timestamptz not null default now()
);

alter table trust_levels enable row level security;
create policy "trust_levels_own" on trust_levels for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public-read RLS for global reference tables
alter table firms enable row level security;
alter table groups enable row level security;
alter table bankers enable row level security;
alter table banker_profiles enable row level security;
alter table banker_deals enable row level security;

create policy "firms_public_read" on firms for select using (auth.uid() is not null);
create policy "groups_public_read" on groups for select using (auth.uid() is not null);
create policy "bankers_public_read" on bankers for select using (auth.uid() is not null);
create policy "banker_profiles_public_read" on banker_profiles for select using (auth.uid() is not null);
create policy "banker_deals_public_read" on banker_deals for select using (auth.uid() is not null);
