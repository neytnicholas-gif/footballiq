-- FootballIQ V2 Competitive Platform
-- Run this whole file once in Supabase SQL Editor.
-- It is safe to run again.

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

alter table public.quiz_results add column if not exists attempt_id text;
alter table public.quiz_results add column if not exists activity_date date;

alter table public.mode_stats enable row level security;
alter table public.season_stats enable row level security;

-- Leaderboards need public read access. Users still cannot directly write competitive stats.
drop policy if exists "Mode stats are publicly readable" on public.mode_stats;
create policy "Mode stats are publicly readable" on public.mode_stats for select using (true);
drop policy if exists "Season stats are publicly readable" on public.season_stats;
create policy "Season stats are publicly readable" on public.season_stats for select using (true);

-- Period leaderboards aggregate from a restricted public view, not raw private rows.
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

grant select on public.public_leaderboard_quiz_results to anon;
grant select on public.public_leaderboard_quiz_results to authenticated;

-- Preserve one-reward-per-quiz integrity.
create unique index if not exists quiz_results_first_completion
on public.quiz_results(user_id, quiz_id);
create unique index if not exists quiz_results_attempt_once
on public.quiz_results(user_id, quiz_id, attempt_id)
where attempt_id is not null;
create index if not exists quiz_results_user_completed_idx on public.quiz_results(user_id, completed_at desc);
create index if not exists quiz_results_completed_idx on public.quiz_results(completed_at desc);
create index if not exists quiz_results_activity_date_idx on public.quiz_results(activity_date desc);
create index if not exists mode_stats_mode_rating_idx on public.mode_stats(mode, rating desc);
create index if not exists season_stats_season_rating_idx on public.season_stats(season_id, rating desc);

create or replace function public.competitive_mode_from_quiz(p_quiz_id text)
returns text language sql immutable as $$
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
returns text language sql immutable as $$
  select extract(year from p_date)::int::text || '-S' || (extract(quarter from p_date)::int)::text
$$;

drop function if exists public.complete_quiz(text, integer, integer, integer, date);
drop function if exists public.complete_quiz(text, integer, integer, integer, date, text);

create or replace function public.complete_quiz(
  p_quiz_id text,
  p_score integer,
  p_total integer,
  p_xp integer,
  p_activity_date date,
  p_attempt_id text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  previous_date date;
  next_streak integer;
  inserted_count integer;
  mode_name text;
  season_name text;
  rating_change integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_score < 0 or p_total <= 0 or p_score > p_total then raise exception 'Invalid quiz result'; end if;

  mode_name := public.competitive_mode_from_quiz(p_quiz_id);
  season_name := public.current_footballiq_season(p_activity_date);
  rating_change := (p_score * 20) - (p_total * 8);

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  insert into public.quiz_results(user_id, quiz_id, score, total, xp_earned, attempt_id, activity_date)
  values (uid, p_quiz_id, p_score, p_total, p_xp, p_attempt_id, p_activity_date)
  on conflict (user_id, quiz_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return;
  end if;

  select last_activity_date, current_streak into previous_date, next_streak from public.profiles where id = uid for update;
  if previous_date = p_activity_date then next_streak := greatest(next_streak, 1);
  elsif previous_date = p_activity_date - 1 then next_streak := next_streak + 1;
  else next_streak := 1;
  end if;

  update public.profiles set
    xp = xp + p_xp,
    rating = greatest(0, rating + rating_change),
    quizzes_completed = quizzes_completed + 1,
    correct_answers = correct_answers + p_score,
    total_answers = total_answers + p_total,
    perfect_quizzes = perfect_quizzes + case when p_score = p_total then 1 else 0 end,
    streak = next_streak,
    current_streak = next_streak,
    longest_streak = greatest(longest_streak, next_streak),
    last_activity_date = p_activity_date
  where id = uid;

  insert into public.mode_stats(user_id, mode, rating, xp, quizzes_completed, correct_answers, total_answers, perfect_quizzes, best_score)
  values (uid, mode_name, greatest(0, 1000 + rating_change), p_xp, 1, p_score, p_total, case when p_score = p_total then 1 else 0 end, p_score)
  on conflict (user_id, mode) do update set
    rating = greatest(0, public.mode_stats.rating + rating_change),
    xp = public.mode_stats.xp + excluded.xp,
    quizzes_completed = public.mode_stats.quizzes_completed + 1,
    correct_answers = public.mode_stats.correct_answers + excluded.correct_answers,
    total_answers = public.mode_stats.total_answers + excluded.total_answers,
    perfect_quizzes = public.mode_stats.perfect_quizzes + excluded.perfect_quizzes,
    best_score = greatest(public.mode_stats.best_score, excluded.best_score),
    updated_at = now();

  insert into public.season_stats(user_id, season_id, rating, xp, quizzes_completed, correct_answers, total_answers, perfect_quizzes)
  values (uid, season_name, greatest(0, 1000 + rating_change), p_xp, 1, p_score, p_total, case when p_score = p_total then 1 else 0 end)
  on conflict (user_id, season_id) do update set
    rating = greatest(0, public.season_stats.rating + rating_change),
    xp = public.season_stats.xp + excluded.xp,
    quizzes_completed = public.season_stats.quizzes_completed + 1,
    correct_answers = public.season_stats.correct_answers + excluded.correct_answers,
    total_answers = public.season_stats.total_answers + excluded.total_answers,
    perfect_quizzes = public.season_stats.perfect_quizzes + excluded.perfect_quizzes,
    updated_at = now();
end;
$$;

grant execute on function public.complete_quiz(text, integer, integer, integer, date, text) to authenticated;
