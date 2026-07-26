-- FootballIQ beta-gate RLS tightening + public leaderboard views
-- Run manually in Supabase SQL editor after your existing setup scripts.
-- Safe to run multiple times.

begin;

-- 1) Keep profile rows private by default.
drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
using (auth.uid() = id);

-- 2) Keep quiz result rows private by default.
drop policy if exists "Quiz results are publicly readable" on public.quiz_results;
drop policy if exists "Users can read own quiz results" on public.quiz_results;
create policy "Users can read own quiz results"
on public.quiz_results
for select
using (auth.uid() = user_id);

-- 3) Expose only leaderboard-safe public profile fields.
create or replace view public.public_leaderboard_profiles as
select
  p.id,
  p.username,
  p.rating,
  p.xp,
  p.quizzes_completed,
  p.correct_answers,
  p.total_answers,
  p.perfect_quizzes,
  p.current_streak,
  p.longest_streak,
  p.created_at
from public.profiles p
where p.username is not null;

grant select on public.public_leaderboard_profiles to anon;
grant select on public.public_leaderboard_profiles to authenticated;

-- 4) Expose only leaderboard-safe quiz completion fields.
create or replace view public.public_leaderboard_quiz_results as
select
  r.user_id,
  r.quiz_id,
  r.score,
  r.total,
  r.xp_earned,
  r.activity_date,
  r.completed_at
from public.quiz_results r;

grant select on public.public_leaderboard_quiz_results to anon;
grant select on public.public_leaderboard_quiz_results to authenticated;

commit;
