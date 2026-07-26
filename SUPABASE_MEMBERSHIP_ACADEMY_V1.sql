-- FootballIQ Platform Evolution V1
-- Membership foundation + academy completion persistence
-- Safe to run after existing base schema.

begin;

alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'pro'));

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check check (
    subscription_status in ('inactive', 'trialing', 'active', 'expired', 'cancelled')
  );

create table if not exists public.academy_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_key text not null,
  track text not null,
  confidence_label text,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, experience_key)
);

alter table public.academy_completions
  drop constraint if exists academy_completions_track_check;

alter table public.academy_completions
  add constraint academy_completions_track_check check (track in ('scout', 'referee'));

alter table public.academy_completions enable row level security;

drop policy if exists "academy_completions_select_own" on public.academy_completions;
create policy "academy_completions_select_own"
  on public.academy_completions for select
  using (auth.uid() = user_id);

drop policy if exists "academy_completions_upsert_own" on public.academy_completions;
create policy "academy_completions_upsert_own"
  on public.academy_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "academy_completions_update_own" on public.academy_completions;
create policy "academy_completions_update_own"
  on public.academy_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists academy_completions_track_idx
  on public.academy_completions(track, completed_at desc);

create or replace function public.set_academy_completions_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_academy_completions_updated_at on public.academy_completions;
create trigger trg_academy_completions_updated_at
before update on public.academy_completions
for each row execute procedure public.set_academy_completions_updated_at();

commit;
