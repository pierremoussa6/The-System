create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Player',
  role text not null default 'player' check (role in ('creator', 'admin', 'player')),
  account_status text not null default 'pending_approval' check (account_status in ('pending_approval', 'approved', 'rejected', 'blocked')),
  timezone text not null default 'Europe/Stockholm',
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists account_status text not null default 'pending_approval'
check (account_status in ('pending_approval', 'approved', 'rejected', 'blocked'));

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('creator', 'admin', 'player'));

alter table public.profiles
drop constraint if exists profiles_account_status_check;

alter table public.profiles
add constraint profiles_account_status_check
check (account_status in ('pending_approval', 'approved', 'rejected', 'blocked'));

create table if not exists public.user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0,
  lifetime_xp integer not null default 0,
  spendable_xp integer not null default 0,
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
  workout_program_json jsonb,
  ai_quest_index integer not null default 0,
  active_effects_json jsonb not null default '{}'::jsonb,
  task_history_json jsonb not null default '[]'::jsonb,
  artifact_history_json jsonb not null default '[]'::jsonb,
  media_library_json jsonb not null default '[]'::jsonb,
  creator_audit_log_json jsonb not null default '[]'::jsonb,
  app_state_json jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state
add column if not exists app_state_json jsonb;

alter table public.user_state
add column if not exists lifetime_xp integer not null default 0;

alter table public.user_state
add column if not exists spendable_xp integer not null default 0;

alter table public.user_state
add column if not exists workout_program_json jsonb;

alter table public.user_state
add column if not exists task_history_json jsonb not null default '[]'::jsonb;

alter table public.user_state
add column if not exists artifact_history_json jsonb not null default '[]'::jsonb;

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

alter table public.user_state
add column if not exists media_library_json jsonb not null default '[]'::jsonb;

alter table public.user_state
add column if not exists creator_audit_log_json jsonb not null default '[]'::jsonb;

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

create table if not exists public.artifact_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artifact_id text not null,
  quantity integer not null default 0,
  owned boolean not null default false,
  active boolean not null default false,
  acquired_at timestamptz,
  last_used_at timestamptz,
  source text not null default 'achievement',
  status text not null default 'locked',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, artifact_id)
);

create table if not exists public.active_artifact_effects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artifact_id text not null,
  effect_type text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artifact_id text not null,
  artifact_name text not null,
  event_type text not null,
  xp_change integer,
  stat_change_json jsonb,
  streak_effect text,
  task_id text,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id text not null,
  task_type text not null,
  title text not null,
  xp integer not null default 0,
  stat_rewards_json jsonb not null default '{}'::jsonb,
  category_source text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id)
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

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  details text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_media (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  scope text not null default 'user' check (scope in ('global', 'user', 'fallback')),
  user_id uuid references public.profiles(id) on delete cascade,
  file_url text not null,
  file_type text not null,
  alt_text text not null default '',
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_audit_logs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  affected_user_id uuid references public.profiles(id) on delete cascade,
  field_changed text not null,
  old_value text not null default '',
  new_value text not null default '',
  created_at timestamptz not null default now()
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
      and role in ('creator', 'admin')
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
      new.account_status := 'approved';
    elsif not (is_system_actor or acting_as_creator) then
      new.role := 'player';
      new.account_status := 'pending_approval';
    else
      new.role := case when new.role in ('creator', 'admin') then new.role else 'player' end;
      if new.role in ('creator', 'admin') then
        new.account_status := 'approved';
      else
        new.account_status := coalesce(nullif(new.account_status, ''), 'pending_approval');
      end if;
    end if;
  else
    if request_user_id = old.id and not acting_as_creator and not is_system_actor then
      new.email := old.email;
      new.role := old.role;
      new.account_status := old.account_status;
    else
      new.email := lower(trim(coalesce(nullif(new.email, ''), old.email)));

      if new.email = 'pierremoussa6@gmail.com' then
        new.role := 'creator';
        new.account_status := 'approved';
      elsif acting_as_creator or is_system_actor then
        new.role := case when new.role in ('creator', 'admin') then new.role else 'player' end;
        if new.role in ('creator', 'admin') then
          new.account_status := 'approved';
        else
          new.account_status := case
            when new.account_status in ('pending_approval', 'approved', 'rejected', 'blocked') then new.account_status
            else old.account_status
          end;
        end if;
      else
        new.role := old.role;
        new.account_status := old.account_status;
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

create or replace function public.notify_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status = 'pending_approval' then
    insert into public.admin_notifications (
      profile_id,
      notification_type,
      title,
      details
    )
    values (
      new.id,
      'registration_pending',
      'New Player Awaiting Approval',
      new.display_name || ' (' || new.email || ') is waiting for creator approval.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_notify_pending on public.profiles;

create trigger profiles_notify_pending
after insert on public.profiles
for each row
execute function public.notify_pending_profile();

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.daily_quests enable row level security;
alter table public.special_quests enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.artifacts enable row level security;
alter table public.artifact_inventory enable row level security;
alter table public.active_artifact_effects enable row level security;
alter table public.artifact_events enable row level security;
alter table public.task_history enable row level security;
alter table public.system_logs enable row level security;
alter table public.achievements enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.creator_media enable row level security;
alter table public.creator_audit_logs enable row level security;

drop policy if exists "profiles_select_own_or_creator" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_creator" on public.profiles;
drop policy if exists "user_state_own_or_creator" on public.user_state;
drop policy if exists "daily_quests_own_or_creator" on public.daily_quests;
drop policy if exists "special_quests_own_or_creator" on public.special_quests;
drop policy if exists "weekly_plans_own_or_creator" on public.weekly_plans;
drop policy if exists "artifacts_own_or_creator" on public.artifacts;
drop policy if exists "artifact_inventory_own_or_creator" on public.artifact_inventory;
drop policy if exists "active_artifact_effects_own_or_creator" on public.active_artifact_effects;
drop policy if exists "artifact_events_own_or_creator" on public.artifact_events;
drop policy if exists "task_history_own_or_creator" on public.task_history;
drop policy if exists "system_logs_own_or_creator" on public.system_logs;
drop policy if exists "achievements_own_or_creator" on public.achievements;
drop policy if exists "reminder_logs_own_or_creator" on public.reminder_logs;
drop policy if exists "admin_notifications_creator" on public.admin_notifications;
drop policy if exists "creator_media_creator_manage" on public.creator_media;
drop policy if exists "creator_media_select_visible" on public.creator_media;
drop policy if exists "creator_audit_logs_creator" on public.creator_audit_logs;

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

create policy "artifact_inventory_own_or_creator"
on public.artifact_inventory for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "active_artifact_effects_own_or_creator"
on public.active_artifact_effects for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "artifact_events_own_or_creator"
on public.artifact_events for all
using (auth.uid() = user_id or public.is_creator())
with check (auth.uid() = user_id or public.is_creator());

create policy "task_history_own_or_creator"
on public.task_history for all
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

create policy "admin_notifications_creator"
on public.admin_notifications for all
using (public.is_creator())
with check (public.is_creator());

create policy "creator_media_select_visible"
on public.creator_media for select
using (
  public.is_creator()
  or scope in ('global', 'fallback')
  or auth.uid() = user_id
);

create policy "creator_media_creator_manage"
on public.creator_media for all
using (public.is_creator())
with check (public.is_creator());

create policy "creator_audit_logs_creator"
on public.creator_audit_logs for all
using (public.is_creator())
with check (public.is_creator());

update public.profiles
set role = 'creator',
    account_status = 'approved'
where lower(email) = 'pierremoussa6@gmail.com';

update public.profiles
set account_status = 'approved'
where account_status is null
   or exists (
    select 1
    from public.user_state
    where public.user_state.user_id = public.profiles.id
   );

update public.user_state
set lifetime_xp = total_xp
where lifetime_xp = 0
  and total_xp > 0;

update public.user_state
set spendable_xp = total_xp
where spendable_xp = 0
  and total_xp > 0;
