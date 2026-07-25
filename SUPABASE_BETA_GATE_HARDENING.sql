-- FootballIQ beta-gate hardening for persisted state integrity
-- Run manually in Supabase SQL editor after backup/snapshot.
-- This script is idempotent and safe to re-run.

begin;

-- 1) Preserve one-reward-per-quiz integrity at the database level.
alter table public.quiz_results add column if not exists attempt_id text;
alter table public.quiz_results add column if not exists activity_date date;

update public.quiz_results
set activity_date = (completed_at at time zone 'Europe/Brussels')::date
where activity_date is null;

delete from public.quiz_results q
using public.quiz_results d
where q.user_id = d.user_id
  and q.quiz_id = d.quiz_id
  and q.id > d.id;

create unique index if not exists quiz_results_first_completion
on public.quiz_results(user_id, quiz_id);

create unique index if not exists quiz_results_attempt_once
on public.quiz_results(user_id, quiz_id, attempt_id)
where attempt_id is not null;

create index if not exists quiz_results_activity_date_idx
on public.quiz_results(activity_date desc);

create index if not exists quiz_results_completed_idx
on public.quiz_results(completed_at desc);

create index if not exists quiz_results_user_completed_idx
on public.quiz_results(user_id, completed_at desc);

-- 2) Keep helper functions available across both base and competitive installs.
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

-- 3) Canonical completion RPC with idempotent insert + atomic profile updates.
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
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_score < 0 or p_total <= 0 or p_score > p_total then
    raise exception 'Invalid quiz result';
  end if;

  insert into public.profiles (id) values (uid)
  on conflict (id) do nothing;

  insert into public.quiz_results(user_id, quiz_id, score, total, xp_earned, attempt_id, activity_date)
  values (uid, p_quiz_id, p_score, p_total, p_xp, p_attempt_id, p_activity_date)
  on conflict (user_id, quiz_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return;
  end if;

  select last_activity_date, current_streak
    into previous_date, next_streak
  from public.profiles
  where id = uid
  for update;

  if previous_date = p_activity_date then
    next_streak := greatest(next_streak, 1);
  elsif previous_date = p_activity_date - 1 then
    next_streak := next_streak + 1;
  else
    next_streak := 1;
  end if;

  rating_change := (p_score * 20) - (p_total * 8);

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
    last_activity_date = p_activity_date
  where id = uid;

  if to_regclass('public.mode_stats') is not null then
    mode_name := public.competitive_mode_from_quiz(p_quiz_id);

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
  end if;

  if to_regclass('public.season_stats') is not null then
    season_name := public.current_footballiq_season(p_activity_date);

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
  end if;
end;
$$;

grant execute on function public.complete_quiz(text, integer, integer, integer, date, text) to authenticated;

commit;
