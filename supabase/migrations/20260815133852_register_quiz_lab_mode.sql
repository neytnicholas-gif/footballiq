-- Keep Quiz Lab results distinct in public leaderboards and include them in
-- judgement-focused friend leagues. Browser claims still pass through the
-- server-owned verifier before these rows are written.
create or replace function public.competitive_mode_from_quiz(p_quiz_id text)
returns text language sql immutable set search_path=pg_catalog,public as $$
  select case
    when p_quiz_id like 'daily-%' then 'daily'
    when p_quiz_id like 'referee%' then 'referee-decisions'
    when p_quiz_id like 'would-you-scout%' then 'scout-mode'
    when p_quiz_id like 'higher-lower%' then 'higher-lower'
    when p_quiz_id like 'career-path%' then 'career-path'
    when p_quiz_id like 'who-am-i%' then 'who-am-i'
    when p_quiz_id like 'league-world-%' then 'league-world'
    when p_quiz_id like 'quiz-lab-%' then 'quiz-lab'
    else 'football-duels'
  end
$$;

create or replace function public.quiz_get_friend_league_leaderboard(p_league_id uuid)
returns table(user_id uuid,username text,score_value bigint,accuracy_percent numeric,xp_earned bigint,quizzes_completed integer,rank bigint)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
#variable_conflict use_column
declare selected public.quiz_friend_leagues; start_at timestamptz;
begin
  if not public.quiz_is_friend_league_member(p_league_id) then raise exception 'LEAGUE_NOT_FOUND'; end if;
  select * into selected from public.quiz_friend_leagues where id=p_league_id and is_active;
  start_at:=case selected.period when 'weekly' then date_trunc('week',now()) when 'monthly' then date_trunc('month',now()) when 'season' then date_trunc('year',now()) else null end;
  return query with totals as (
    select member.user_id,coalesce(profile.username,'Anonymous') username,member.joined_at,
      coalesce(sum(result.xp_earned) filter(where result.id is not null),0)::bigint xp_earned,
      count(result.id)::integer quizzes_completed,
      coalesce(sum(result.score),0)::bigint correct_answers,
      coalesce(sum(result.total),0)::bigint total_answers
    from public.quiz_friend_league_members member
    left join public.profiles profile on profile.id=member.user_id
    left join public.quiz_results result on result.user_id=member.user_id
      and (start_at is null or result.completed_at>=start_at)
      and (
        selected.content_mode='all'
        or (selected.content_mode='league_world' and result.quiz_id=any(array(select 'league-world-'||key from unnest(selected.league_keys) key)))
        or (selected.content_mode='judgement' and public.competitive_mode_from_quiz(result.quiz_id) in ('daily','referee-decisions','scout-mode','quiz-lab'))
        or (selected.content_mode='quick_games' and public.competitive_mode_from_quiz(result.quiz_id) in ('football-duels','higher-lower','career-path','who-am-i'))
      )
    where member.league_id=p_league_id
    group by member.user_id,profile.username,member.joined_at
  ), scored as (
    select totals.*,
      case when selected.scoring_mode='accuracy' then coalesce(round(totals.correct_answers*10000.0/nullif(totals.total_answers,0)),0)::bigint else totals.xp_earned end score_value,
      case when totals.total_answers>0 then round(totals.correct_answers*100.0/totals.total_answers,1) else 0 end accuracy_percent
    from totals
  )
  select scored.user_id,scored.username,scored.score_value,scored.accuracy_percent,scored.xp_earned,scored.quizzes_completed,
    rank() over(order by scored.score_value desc,scored.xp_earned desc,scored.joined_at)
  from scored order by scored.score_value desc,scored.xp_earned desc,scored.joined_at;
end $$;

revoke all on function public.quiz_get_friend_league_leaderboard(uuid) from public,anon,authenticated;
grant execute on function public.quiz_get_friend_league_leaderboard(uuid) to authenticated;
alter function public.quiz_get_friend_league_leaderboard(uuid) set statement_timeout='8s';
