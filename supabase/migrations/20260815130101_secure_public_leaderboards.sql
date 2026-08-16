create or replace function public.get_public_profiles(
  p_user_ids uuid[] default null,
  p_username text default null
)
returns table(
  id uuid,
  username text,
  rating integer,
  xp integer,
  quizzes_completed integer,
  correct_answers integer,
  total_answers integer,
  perfect_quizzes integer,
  current_streak integer,
  longest_streak integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  select
    profile.id,
    profile.username,
    profile.rating,
    profile.xp,
    profile.quizzes_completed,
    profile.correct_answers,
    profile.total_answers,
    profile.perfect_quizzes,
    profile.current_streak,
    profile.longest_streak,
    profile.created_at
  from public.profiles profile
  where profile.username is not null
    and (p_user_ids is null or profile.id=any(p_user_ids))
    and (p_username is null or lower(profile.username)=lower(btrim(p_username)))
  order by profile.xp desc,profile.created_at
  limit 100
$$;

create or replace function public.get_public_quiz_results(
  p_start_date date,
  p_end_date date
)
returns table(
  user_id uuid,
  quiz_id text,
  score integer,
  total integer,
  xp_earned integer,
  activity_date date,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  select
    result.user_id,
    result.quiz_id,
    result.score,
    result.total,
    result.xp_earned,
    (result.completed_at at time zone 'Europe/Brussels')::date as activity_date,
    result.completed_at
  from public.quiz_results result
  where p_end_date>p_start_date
    and (result.completed_at at time zone 'Europe/Brussels')::date>=p_start_date
    and (result.completed_at at time zone 'Europe/Brussels')::date<p_end_date
  order by result.completed_at desc
  limit 2000
$$;

revoke all on function public.get_public_profiles(uuid[],text),public.get_public_quiz_results(date,date)
  from public,anon,authenticated,service_role;
grant execute on function public.get_public_profiles(uuid[],text),public.get_public_quiz_results(date,date)
  to anon,authenticated;
alter function public.get_public_profiles(uuid[],text) set statement_timeout='3s';
alter function public.get_public_quiz_results(date,date) set statement_timeout='3s';

drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Public profiles are readable" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists profiles_owner_read on public.profiles;
create policy profiles_owner_read on public.profiles
  for select to authenticated using ((select auth.uid())=id);

drop policy if exists "Users can read own quiz results" on public.quiz_results;
drop policy if exists quiz_results_owner_read on public.quiz_results;
create policy quiz_results_owner_read on public.quiz_results
  for select to authenticated using ((select auth.uid())=user_id);

revoke select on table public.profiles,public.quiz_results from public,anon,authenticated;
grant select on table public.profiles,public.quiz_results to authenticated;
grant all on table public.profiles,public.quiz_results to service_role;

drop view if exists public.public_leaderboard_profiles;
drop view if exists public.public_leaderboard_quiz_results;
