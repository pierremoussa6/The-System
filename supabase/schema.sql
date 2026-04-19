create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Player',
  role text not null default 'player' check (role in ('creator', 'player')),
  timezone text not null default 'Europe/Stockholm',
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0,
  streak integer not null default 0,
  last_completion_date date,
  strength integer not null default 0,
  vitality integer not null default 0,
  discipline integer not null default 0,
  focus integer not null default 0,
  intelligence integer not null default 0,
  agility integer not null default 0,
  magic_resistance integer not null default 0,
  daily_hp integer,
  daily_hp_date date,
  ai_analysis_json jsonb,
  ai_weekly_plan_json jsonb,
  ai_quest_index integer not null default 0,
  active_effects_json jsonb not null default '{}'::jsonb,
  app_state_json jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state
add column if not exists app_state_json jsonb;

alter table public.user_state
add column if not exists intelligence integer not null default 0;

alter table public.user_state
add column if not exists agility integer not null default 0;

alter table public.user_state
add column if not exists magic_resistance integer not null default 0;

alter table public.user_state
add column if not exists daily_hp integer;

alter table public.user_state
add column if not exists daily_hp_date date;

create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_date date not null,
  quest_key integer not null,
  title text not null,
  xp integer not null,
  completed boolean not null default false,
  awarded_today boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, quest_date, quest_key)
);

create table if not exists public.special_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_date date not null,
  title text not null,
  description text not null,
  xp integer not null,
  stat_rewards_json jsonb not null default '{}'::jsonb,
  penalty text not null,
  status text not null default 'pending',
  awarded_today boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_starts_on date not null,
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_starts_on)
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artifact_key text not null,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, artifact_key)
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_type text not null,
  title text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_date date not null,
  channel text not null default 'email',
  sent_at timestamptz not null default now(),
  unique (user_id, reminder_date, channel)
);

create or replace function public.is_creator(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'creator'
  );
$$;

create or replace function public.apply_profile_guardrails()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_user_id uuid := auth.uid();
  request_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  is_system_actor boolean :=
    current_user in ('postgres', 'supabase_admin', 'service_role')
    or session_user in ('postgres', 'supabase_admin', 'service_role');
  acting_as_creator boolean := public.is_creator(request_user_id);
begin
  if tg_op = 'INSERT' then
    new.email := lower(trim(coalesce(nullif(new.email, ''), request_email)));

    if request_user_id is not null then
      new.email := coalesce(nullif(request_email, ''), new.email);
    end if;

    if new.email = 'pierremoussa6@gmail.com' then
      new.role := 'creator';
    elsif not (is_system_actor or acting_as_creator) then
      new.role := 'player';
    else
      new.role := case when new.role = 'creator' then 'creator' else 'player' end;
    end if;
  else
    if request_user_id = old.id and not acting_as_creator and not is_system_actor then
      new.email := old.email;
      new.role := old.role;
    else
      new.email := lower(trim(coalesce(nullif(new.email, ''), old.email)));

      if new.email = 'pierremoussa6@gmail.com' then
        new.role := 'creator';
      elsif acting_as_creator or is_system_actor then
        new.role := case when new.role = 'creator' then 'creator' else 'player' end;
      else
        new.role := old.role;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_apply_guardrails on public.profiles;

create trigger profiles_apply_guardrails
before insert or update on public.profiles
for each row
execute function public.apply_profile_guardrails();

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.daily_quests enable row level security;
alter table public.special_quests enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.artifacts enable row level security;
alter table public.system_logs enable row level security;
alter table public.achievements enable row level security;
alter table public.reminder_logs enable row level security;

drop policy if exists "profiles_select_own_or_creator" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_creator" on public.profiles;
drop policy if exists "user_state_own_or_creator" on public.user_state;
drop policy if exists "daily_quests_own_or_creator" on public.daily_quests;
drop policy if exists "special_quests_own_or_creator" on public.special_quests;
drop policy if exists "weekly_plans_own_or_creator" on public.weekly_plans;
drop policy if exists "artifacts_own_or_creator" on public.artifacts;
drop policy if exists "system_logs_own_or_creator" on public.system_logs;
drop policy if exists "achievements_own_or_creator" on public.achievements;
drop policy if exists "reminder_logs_own_or_creator" on public.reminder_logs;

create policy "profiles_select_own_or_creator"
on public.profiles for select
using (auth.uid() = id or public.is_creator());

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own_or_creator"
on public.profiles for update
using (auth.uid() = id or public.is_creator())
with check (auth.uid() = id or public.is_creator());

create policy "user_state_own_or_creator"
on public.user_state for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "daily_quests_own_or_creator"
on public.daily_quests for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "special_quests_own_or_creator"
on public.special_quests for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "weekly_plans_own_or_creator"
on public.weekly_plans for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "artifacts_own_or_creator"
on public.artifacts for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "system_logs_own_or_creator"
on public.system_logs for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "achievements_own_or_creator"
on public.achievements for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "reminder_logs_own_or_creator"
on public.reminder_logs for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

update public.profiles
set role = 'creator'
where lower(email) = 'pierremoussa6@gmail.com';
