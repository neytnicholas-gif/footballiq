-- Repair progression integrity for idempotent, replay-safe quiz completion.
-- This migration is additive and intended for local review before any remote apply.

create table if not exists public.mode_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  rating integer not null default 1000,
  xp integer not null default 0,
  quizzes_completed integer not null default 0,
  correct_answers integer not null default 0,
  total_answers integer not null default 0,
  perfect_quizzes integer not null default 0,
  best_score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create table if not exists public.season_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null,
  rating integer not null default 1000,
  xp integer not null default 0,
  quizzes_completed integer not null default 0,
  correct_answers integer not null default 0,
  total_answers integer not null default 0,
  perfect_quizzes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

alter table public.mode_stats enable row level security;
alter table public.season_stats enable row level security;

drop policy if exists "Mode stats are publicly readable" on public.mode_stats;
create policy "Mode stats are publicly readable"
  on public.mode_stats for select to anon, authenticated using (true);
drop policy if exists "Season stats are publicly readable" on public.season_stats;
create policy "Season stats are publicly readable"
  on public.season_stats for select to anon, authenticated using (true);

revoke all on table public.mode_stats, public.season_stats from public, anon, authenticated;
grant select on table public.mode_stats, public.season_stats to anon, authenticated;
grant all on table public.mode_stats, public.season_stats to service_role;

create index if not exists mode_stats_mode_rating_idx
  on public.mode_stats(mode, rating desc);
create index if not exists season_stats_season_rating_idx
  on public.season_stats(season_id, rating desc);

alter table if exists public.quiz_results
  add column if not exists activity_date date;
update public.quiz_results
set activity_date = (completed_at at time zone 'Europe/Brussels')::date
where activity_date is null;
alter table if exists public.quiz_results
  alter column activity_date set default ((now() at time zone 'Europe/Brussels')::date);

create or replace view public.public_leaderboard_profiles as
select
  id,
  username,
  rating,
  xp,
  quizzes_completed,
  correct_answers,
  total_answers,
  perfect_quizzes,
  current_streak,
  longest_streak,
  created_at
from public.profiles
where username is not null;

create or replace view public.public_leaderboard_quiz_results as
select
  user_id,
  quiz_id,
  score,
  total,
  xp_earned,
  activity_date,
  completed_at
from public.quiz_results;

revoke all on table public.public_leaderboard_profiles, public.public_leaderboard_quiz_results
  from public, anon, authenticated;
grant select on table public.public_leaderboard_profiles, public.public_leaderboard_quiz_results
  to anon, authenticated;


alter table if exists public.quiz_results
  add column if not exists completion_key text;

update public.quiz_results
set completion_key = concat('legacy:', md5(concat_ws(':', id::text, user_id::text, completed_at::text)))
where completion_key is null;

alter table if exists public.quiz_results
  alter column completion_key set not null;

alter table if exists public.quiz_results
  drop constraint if exists quiz_results_completion_key_format;
alter table if exists public.quiz_results
  add constraint quiz_results_completion_key_format
  check (
    char_length(completion_key) between 24 and 120
    and completion_key ~ '^[A-Za-z0-9:_-]+$'
  );

create unique index if not exists quiz_results_user_completion_key_idx
  on public.quiz_results(user_id, completion_key);

revoke insert, update, delete on table public.quiz_results from anon, authenticated;
revoke insert, update, delete on table public.mode_stats from anon, authenticated;
revoke insert, update, delete on table public.season_stats from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert own quiz results" on public.quiz_results;

create or replace function public.set_profile_username(
  p_username text
)
returns table (id uuid, username text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  clean_username text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  clean_username := btrim(p_username);
  if char_length(clean_username) < 3 or char_length(clean_username) > 20 then
    raise exception 'Invalid username length';
  end if;
  if clean_username !~ '^[A-Za-z0-9_]+$' then
    raise exception 'Invalid username format';
  end if;

  insert into public.profiles (id, username)
  values (uid, clean_username)
  on conflict on constraint profiles_pkey do update
  set username = excluded.username;

  return query
  select p.id as id, p.username as username
  from public.profiles p
  where p.id = uid;
end;
$$;

revoke all on function public.set_profile_username(text) from public, anon, authenticated, service_role;
grant execute on function public.set_profile_username(text) to authenticated;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated, service_role;

create or replace function public.competitive_mode_from_quiz(p_quiz_id text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_quiz_id like 'daily-%' then 'daily'
    when p_quiz_id like 'referee%' then 'referee-decisions'
    when p_quiz_id like 'would-you-scout%' then 'scout-mode'
    when p_quiz_id like 'higher-lower%' then 'higher-lower'
    when p_quiz_id like 'career-path%' then 'career-path'
    when p_quiz_id like 'who-am-i%' then 'who-am-i'
    else 'football-duels'
  end
$$;

create or replace function public.current_footballiq_season(p_date date)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select extract(year from p_date)::int::text || '-S' || (extract(quarter from p_date)::int)::text
$$;

drop function if exists public.complete_quiz(text, integer, integer, integer, date);

create or replace function public.complete_quiz(
  p_quiz_id text,
  p_score integer,
  p_total integer,
  p_xp integer,
  p_completion_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  previous_date date;
  next_streak integer;
  mode_name text;
  season_name text;
  rating_change integer;
  inserted_count integer;
  activity_day date := (now() at time zone 'Europe/Brussels')::date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_score < 0 or p_total <= 0 or p_score > p_total then
    raise exception 'Invalid quiz result';
  end if;

  if char_length(p_completion_key) < 24 or char_length(p_completion_key) > 120 then
    raise exception 'Invalid completion key length';
  end if;

  if p_completion_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'Invalid completion key format';
  end if;

  mode_name := public.competitive_mode_from_quiz(p_quiz_id);
  season_name := public.current_footballiq_season(activity_day);
  rating_change := (p_score * 20) - (p_total * 8);

  insert into public.profiles (id)
  values (uid)
  on conflict (id) do nothing;

  insert into public.quiz_results(user_id, quiz_id, score, total, xp_earned, completion_key)
  values (uid, p_quiz_id, p_score, p_total, p_xp, p_completion_key)
  on conflict (user_id, completion_key) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object(
      'awarded', false,
      'already_processed', true,
      'completion_key', p_completion_key,
      'activity_date', activity_day
    );
  end if;

  select last_activity_date, current_streak
  into previous_date, next_streak
  from public.profiles
  where id = uid
  for update;

  if previous_date = activity_day then
    next_streak := greatest(next_streak, 1);
  elsif previous_date = activity_day - 1 then
    next_streak := next_streak + 1;
  else
    next_streak := 1;
  end if;

  update public.profiles
  set
    xp = xp + p_xp,
    rating = greatest(0, rating + rating_change),
    quizzes_completed = quizzes_completed + 1,
    correct_answers = correct_answers + p_score,
    total_answers = total_answers + p_total,
    perfect_quizzes = perfect_quizzes + case when p_score = p_total then 1 else 0 end,
    streak = next_streak,
    current_streak = next_streak,
    longest_streak = greatest(longest_streak, next_streak),
    last_activity_date = activity_day
  where id = uid;

  if to_regclass('public.mode_stats') is not null then
    insert into public.mode_stats(
      user_id,
      mode,
      rating,
      xp,
      quizzes_completed,
      correct_answers,
      total_answers,
      perfect_quizzes,
      best_score
    )
    values (
      uid,
      mode_name,
      greatest(0, 1000 + rating_change),
      p_xp,
      1,
      p_score,
      p_total,
      case when p_score = p_total then 1 else 0 end,
      p_score
    )
    on conflict (user_id, mode) do update
    set
      rating = greatest(0, public.mode_stats.rating + rating_change),
      xp = public.mode_stats.xp + excluded.xp,
      quizzes_completed = public.mode_stats.quizzes_completed + 1,
      correct_answers = public.mode_stats.correct_answers + excluded.correct_answers,
      total_answers = public.mode_stats.total_answers + excluded.total_answers,
      perfect_quizzes = public.mode_stats.perfect_quizzes + excluded.perfect_quizzes,
      best_score = greatest(public.mode_stats.best_score, excluded.best_score),
      updated_at = now();
  end if;

  if to_regclass('public.season_stats') is not null then
    insert into public.season_stats(
      user_id,
      season_id,
      rating,
      xp,
      quizzes_completed,
      correct_answers,
      total_answers,
      perfect_quizzes
    )
    values (
      uid,
      season_name,
      greatest(0, 1000 + rating_change),
      p_xp,
      1,
      p_score,
      p_total,
      case when p_score = p_total then 1 else 0 end
    )
    on conflict (user_id, season_id) do update
    set
      rating = greatest(0, public.season_stats.rating + rating_change),
      xp = public.season_stats.xp + excluded.xp,
      quizzes_completed = public.season_stats.quizzes_completed + 1,
      correct_answers = public.season_stats.correct_answers + excluded.correct_answers,
      total_answers = public.season_stats.total_answers + excluded.total_answers,
      perfect_quizzes = public.season_stats.perfect_quizzes + excluded.perfect_quizzes,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'awarded', true,
    'already_processed', false,
    'completion_key', p_completion_key,
    'activity_date', activity_day
  );
end;
$$;

revoke all on function public.complete_quiz(text, integer, integer, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.complete_quiz(text, integer, integer, integer, text) to authenticated;
