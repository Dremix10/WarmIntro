-- WarmIntro initial schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/pddeejkicavcyhondnim/sql

-- ============================================================
-- PROFILES — extends Supabase Auth users
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  university text not null default 'Rice University',
  graduation_year int not null,
  major text not null,
  skills jsonb not null default '[]',
  experience jsonb not null default '[]',
  target_industries jsonb not null default '[]',
  target_roles jsonb not null default '[]',
  resume_text text not null default '',
  referral_code text unique,
  company_unlocks int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FUNNEL_STATES — per-user funnel + gamification progress
-- ============================================================
create table funnel_states (
  user_id uuid primary key references profiles(id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  level_name text not null default 'Networking Novice',
  streak int not null default 0,
  badges jsonb not null default '[]',
  recent_actions jsonb not null default '[]',
  stages jsonb not null default '[]',
  total_outreach_done int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CONNECTIONS — CRM tracked relationships (alumni pipeline)
-- ============================================================
create table connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  alumni_id text not null,
  alumni_name text not null,
  alumni_role text not null,
  alumni_email text,
  alumni_linkedin_url text not null,
  company_id text not null,
  company_name text not null,
  stage text not null default 'sent',
  notes_summary jsonb,
  sent_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, alumni_id)
);

-- ============================================================
-- SELECTED_COMPANIES — user's picked companies
-- ============================================================
create table selected_companies (
  user_id uuid not null references profiles(id) on delete cascade,
  company_id text not null,
  company_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

-- ============================================================
-- REFERRALS — viral unlock tracking
-- ============================================================
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(referred_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_connections_user on connections(user_id);
create index idx_connections_stage on connections(user_id, stage);
create index idx_selected_companies_user on selected_companies(user_id);
create index idx_referrals_referrer on referrals(referrer_id);
create index idx_profiles_referral_code on profiles(referral_code);

-- ============================================================
-- ROW LEVEL SECURITY — users can only access their own data
-- ============================================================
alter table profiles enable row level security;
alter table funnel_states enable row level security;
alter table connections enable row level security;
alter table selected_companies enable row level security;
alter table referrals enable row level security;

-- Profiles: users read/write their own
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Funnel states: users read/write their own
create policy "Users can read own funnel"
  on funnel_states for select using (auth.uid() = user_id);
create policy "Users can upsert own funnel"
  on funnel_states for insert with check (auth.uid() = user_id);
create policy "Users can update own funnel"
  on funnel_states for update using (auth.uid() = user_id);

-- Connections: users read/write their own
create policy "Users can read own connections"
  on connections for select using (auth.uid() = user_id);
create policy "Users can insert own connections"
  on connections for insert with check (auth.uid() = user_id);
create policy "Users can update own connections"
  on connections for update using (auth.uid() = user_id);

-- Selected companies: users read/write their own
create policy "Users can read own companies"
  on selected_companies for select using (auth.uid() = user_id);
create policy "Users can insert own companies"
  on selected_companies for insert with check (auth.uid() = user_id);
create policy "Users can delete own companies"
  on selected_companies for delete using (auth.uid() = user_id);

-- Referrals: referrer can read their referrals
create policy "Users can read own referrals"
  on referrals for select using (auth.uid() = referrer_id);
create policy "System can insert referrals"
  on referrals for insert with check (auth.uid() = referred_id);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger funnel_states_updated_at
  before update on funnel_states
  for each row execute function update_updated_at();

create trigger connections_updated_at
  before update on connections
  for each row execute function update_updated_at();
