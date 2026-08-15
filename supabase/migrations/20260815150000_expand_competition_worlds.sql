-- Applied after the prediction foundation migrations. Keep the Player Market deliberately focused on three leagues while letting
-- Predictions use every provider-licensed competition and Quizzes cover a
-- broad, original football knowledge catalogue.

create table if not exists public.prediction_competitions (
  league_key text primary key check (league_key ~ '^[a-z0-9-]{2,60}$'),
  provider_league_id bigint not null unique,
  league_name text not null check (char_length(league_name) between 2 and 80),
  country_name text,
  country_code text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now()
);

insert into public.prediction_competitions(league_key,provider_league_id,league_name,country_name,country_code)
values
  ('premier-league',8,'Premier League','England','ENG'),
  ('la-liga',564,'La Liga','Spain','ESP'),
  ('ligue-1',301,'Ligue 1','France','FRA')
on conflict (league_key) do update set
  provider_league_id=excluded.provider_league_id,
  league_name=excluded.league_name,
  country_name=excluded.country_name,
  country_code=excluded.country_code,
  is_active=true,
  last_seen_at=now();

alter table public.prediction_competitions enable row level security;
drop policy if exists prediction_competitions_public_read on public.prediction_competitions;
create policy prediction_competitions_public_read on public.prediction_competitions
for select to anon,authenticated using (is_active);
revoke all on table public.prediction_competitions from public,anon,authenticated;
grant select on table public.prediction_competitions to anon,authenticated;
grant all on table public.prediction_competitions to service_role;

alter table public.prediction_leagues
  add column if not exists ranking_mode text not null default 'points'
  check (ranking_mode in ('points','correct','confidence'));

drop function if exists public.prediction_create_league(text,text,text[]);
create function public.prediction_create_league(
  p_name text,
  p_rule_mode text,
  p_league_keys text[],
  p_ranking_mode text default 'points'
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); clean_name text:=btrim(p_name); clean_keys text[]; candidate text; created public.prediction_leagues;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(clean_name)<3 or char_length(clean_name)>40 then raise exception 'LEAGUE_NAME_INVALID'; end if;
  if p_rule_mode not in ('all','random_1','random_5') then raise exception 'LEAGUE_RULE_INVALID'; end if;
  if p_ranking_mode not in ('points','correct','confidence') then raise exception 'LEAGUE_RANKING_INVALID'; end if;
  select array_agg(distinct requested.key order by requested.key) into clean_keys
  from unnest(coalesce(p_league_keys,array[]::text[])) requested(key)
  join public.prediction_competitions competition on competition.league_key=requested.key and competition.is_active;
  if coalesce(cardinality(clean_keys),0)=0 then raise exception 'LEAGUE_SCOPE_REQUIRED'; end if;
  loop candidate:=upper(substr(md5(gen_random_uuid()::text),1,8)); exit when not exists(select 1 from public.prediction_leagues where league_code=candidate); end loop;
  insert into public.prediction_leagues(league_code,name,owner_user_id,rule_mode,league_keys,ranking_mode)
  values(candidate,clean_name,uid,p_rule_mode,clean_keys,p_ranking_mode) returning * into created;
  insert into public.prediction_league_members(league_id,user_id,role) values(created.id,uid,'owner');
  perform public.prediction_refresh_league_fixtures();
  return to_jsonb(created);
end $$;
revoke all on function public.prediction_create_league(text,text,text[],text) from public,anon,authenticated;
grant execute on function public.prediction_create_league(text,text,text[],text) to authenticated;
alter function public.prediction_create_league(text,text,text[],text) set statement_timeout='5s';

drop function if exists public.prediction_get_league_leaderboard(uuid);
create function public.prediction_get_league_leaderboard(p_league_id uuid)
returns table(user_id uuid,username text,points bigint,picks_scored integer,correct_picks integer,confidence_won integer,ranking_mode text,rank bigint)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
#variable_conflict use_column
declare selected_mode text;
begin
  if not public.prediction_is_league_member(p_league_id) then raise exception 'LEAGUE_NOT_FOUND'; end if;
  select league.ranking_mode into selected_mode from public.prediction_leagues league where league.id=p_league_id;
  return query with scores as (
    select m.user_id,coalesce(profile.username,'Anonymous') username,coalesce(sum(p.points_awarded),0)::bigint points,
      count(p.id) filter(where p.scored_at is not null)::integer picks_scored,
      count(p.id) filter(where p.points_awarded>=3)::integer correct_picks,
      coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0)::integer confidence_won,m.joined_at
    from public.prediction_league_members m left join public.profiles profile on profile.id=m.user_id
    left join public.prediction_league_fixtures lf on lf.league_id=m.league_id
    left join public.predictions p on p.fixture_id=lf.fixture_id and p.user_id=m.user_id
    where m.league_id=p_league_id group by m.user_id,profile.username,m.joined_at
  ) select scores.user_id,scores.username,scores.points,scores.picks_scored,scores.correct_picks,scores.confidence_won,selected_mode,
      rank() over(order by
        case selected_mode when 'correct' then scores.correct_picks when 'confidence' then scores.confidence_won else scores.points end desc,
        scores.points desc,scores.joined_at)
    from scores order by
      case selected_mode when 'correct' then scores.correct_picks when 'confidence' then scores.confidence_won else scores.points end desc,
      scores.points desc,scores.joined_at;
end $$;
revoke all on function public.prediction_get_league_leaderboard(uuid) from public,anon,authenticated;
grant execute on function public.prediction_get_league_leaderboard(uuid) to authenticated;

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
    else 'football-duels'
  end
$$;

create table if not exists public.quiz_league_catalogue (
  league_key text primary key check (league_key ~ '^[a-z0-9-]{2,60}$'),
  league_name text not null,
  country_name text not null,
  sort_order integer not null
);
insert into public.quiz_league_catalogue(league_key,league_name,country_name,sort_order) values
  ('premier-league','Premier League','England',1),('championship','EFL Championship','England',2),
  ('league-one','EFL League One','England',3),('league-two','EFL League Two','England',4),
  ('la-liga','La Liga','Spain',5),('segunda-division','Segunda Division','Spain',6),
  ('ligue-1','Ligue 1','France',7),('bundesliga','Bundesliga','Germany',8),
  ('2-bundesliga','2. Bundesliga','Germany',9),('serie-a','Serie A','Italy',10),
  ('serie-b','Serie B','Italy',11),('eredivisie','Eredivisie','Netherlands',12),
  ('primeira-liga','Primeira Liga','Portugal',13),('belgian-pro-league','Belgian Pro League','Belgium',14),
  ('scottish-premiership','Scottish Premiership','Scotland',15),('super-lig','Super Lig','Turkey',16),
  ('mls','Major League Soccer','United States and Canada',17),('liga-mx','Liga MX','Mexico',18),
  ('brasileirao-serie-a','Brasileirao Serie A','Brazil',19),('liga-profesional','Liga Profesional Argentina','Argentina',20),
  ('saudi-pro-league','Saudi Pro League','Saudi Arabia',21),('j1-league','J1 League','Japan',22),
  ('a-league-men','A-League Men','Australia and New Zealand',23),('danish-superliga','Danish Superliga','Denmark',24)
on conflict (league_key) do update set league_name=excluded.league_name,country_name=excluded.country_name,sort_order=excluded.sort_order;
alter table public.quiz_league_catalogue enable row level security;
drop policy if exists quiz_league_catalogue_public_read on public.quiz_league_catalogue;
create policy quiz_league_catalogue_public_read on public.quiz_league_catalogue for select to anon,authenticated using (true);
revoke all on table public.quiz_league_catalogue from public,anon,authenticated;
grant select on table public.quiz_league_catalogue to anon,authenticated;
grant all on table public.quiz_league_catalogue to service_role;

create table if not exists public.quiz_friend_leagues (
  id uuid primary key default gen_random_uuid(),
  league_code text not null unique check (league_code ~ '^[A-Z0-9]{8}$'),
  name text not null check (char_length(name) between 3 and 40),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  content_mode text not null check (content_mode in ('all','judgement','quick_games','league_world')),
  scoring_mode text not null check (scoring_mode in ('xp','accuracy')),
  period text not null check (period in ('weekly','monthly','season','all')),
  league_keys text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.quiz_friend_league_members (
  league_id uuid not null references public.quiz_friend_leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(league_id,user_id)
);
create index if not exists quiz_friend_league_members_user_idx on public.quiz_friend_league_members(user_id,joined_at desc);
alter table public.quiz_friend_leagues enable row level security;
alter table public.quiz_friend_league_members enable row level security;

create or replace function public.quiz_is_friend_league_member(p_league_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.quiz_friend_league_members member where member.league_id=p_league_id and member.user_id=(select auth.uid()))
$$;
revoke all on function public.quiz_is_friend_league_member(uuid) from public,anon,authenticated;
grant execute on function public.quiz_is_friend_league_member(uuid) to authenticated;

drop policy if exists quiz_friend_leagues_member_read on public.quiz_friend_leagues;
create policy quiz_friend_leagues_member_read on public.quiz_friend_leagues for select to authenticated using (public.quiz_is_friend_league_member(id));
drop policy if exists quiz_friend_league_members_member_read on public.quiz_friend_league_members;
create policy quiz_friend_league_members_member_read on public.quiz_friend_league_members for select to authenticated using (public.quiz_is_friend_league_member(league_id));
revoke all on table public.quiz_friend_leagues,public.quiz_friend_league_members from public,anon,authenticated;
grant select on table public.quiz_friend_leagues,public.quiz_friend_league_members to authenticated;
grant all on table public.quiz_friend_leagues,public.quiz_friend_league_members to service_role;

create or replace function public.quiz_create_friend_league(
  p_name text,p_content_mode text,p_scoring_mode text,p_period text,p_league_keys text[] default '{}'
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); clean_name text:=btrim(p_name); clean_keys text[]:='{}'; candidate text; created public.quiz_friend_leagues;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(clean_name)<3 or char_length(clean_name)>40 then raise exception 'LEAGUE_NAME_INVALID'; end if;
  if p_content_mode not in ('all','judgement','quick_games','league_world') then raise exception 'CONTENT_MODE_INVALID'; end if;
  if p_scoring_mode not in ('xp','accuracy') then raise exception 'SCORING_MODE_INVALID'; end if;
  if p_period not in ('weekly','monthly','season','all') then raise exception 'PERIOD_INVALID'; end if;
  if p_content_mode='league_world' then
    select array_agg(distinct requested.key order by requested.key) into clean_keys
    from unnest(coalesce(p_league_keys,array[]::text[])) requested(key)
    join public.quiz_league_catalogue catalogue on catalogue.league_key=requested.key;
    if coalesce(cardinality(clean_keys),0)=0 then raise exception 'LEAGUE_SCOPE_REQUIRED'; end if;
  end if;
  loop candidate:=upper(substr(md5(gen_random_uuid()::text),1,8)); exit when not exists(select 1 from public.quiz_friend_leagues where league_code=candidate); end loop;
  insert into public.quiz_friend_leagues(league_code,name,owner_user_id,content_mode,scoring_mode,period,league_keys)
  values(candidate,clean_name,uid,p_content_mode,p_scoring_mode,p_period,clean_keys) returning * into created;
  insert into public.quiz_friend_league_members(league_id,user_id,role) values(created.id,uid,'owner');
  return to_jsonb(created);
end $$;

create or replace function public.quiz_join_friend_league(p_league_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); target public.quiz_friend_leagues;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.quiz_friend_leagues where league_code=upper(btrim(p_league_code)) and is_active limit 1;
  if not found then raise exception 'LEAGUE_NOT_FOUND'; end if;
  insert into public.quiz_friend_league_members(league_id,user_id,role) values(target.id,uid,case when target.owner_user_id=uid then 'owner' else 'member' end) on conflict do nothing;
  return to_jsonb(target);
end $$;

create or replace function public.quiz_leave_friend_league(p_league_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); removed integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.quiz_friend_leagues where id=p_league_id and owner_user_id=uid) then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  delete from public.quiz_friend_league_members where league_id=p_league_id and user_id=uid;
  get diagnostics removed=row_count;
  return jsonb_build_object('left',removed>0,'league_id',p_league_id);
end $$;

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
        or (selected.content_mode='judgement' and public.competitive_mode_from_quiz(result.quiz_id) in ('daily','referee-decisions','scout-mode'))
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

revoke all on function public.quiz_create_friend_league(text,text,text,text,text[]),public.quiz_join_friend_league(text),public.quiz_leave_friend_league(uuid),public.quiz_get_friend_league_leaderboard(uuid) from public,anon,authenticated;
grant execute on function public.quiz_create_friend_league(text,text,text,text,text[]),public.quiz_join_friend_league(text),public.quiz_leave_friend_league(uuid),public.quiz_get_friend_league_leaderboard(uuid) to authenticated;
alter function public.quiz_create_friend_league(text,text,text,text,text[]) set statement_timeout='5s';
alter function public.quiz_get_friend_league_leaderboard(uuid) set statement_timeout='8s';

alter table public.market_friend_leagues
  add column if not exists score_mode text not null default 'wealth'
  check (score_mode in ('wealth','weekly_gain','realised_profit'));

drop function if exists public.market_create_friend_league(text);
create function public.market_create_friend_league(p_name text,p_score_mode text default 'wealth')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); clean_name text:=btrim(p_name); new_league public.market_friend_leagues%rowtype; candidate_code text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if char_length(clean_name)<3 or char_length(clean_name)>40 then raise exception 'LEAGUE_NAME_INVALID'; end if;
  if p_score_mode not in ('wealth','weekly_gain','realised_profit') then raise exception 'SCORE_MODE_INVALID'; end if;
  loop candidate_code:=upper(substr(md5(gen_random_uuid()::text),1,8)); exit when not exists(select 1 from public.market_friend_leagues where league_code=candidate_code); end loop;
  insert into public.market_friend_leagues(league_code,name,owner_user_id,score_mode) values(candidate_code,clean_name,uid,p_score_mode) returning * into new_league;
  insert into public.market_friend_league_members(league_id,user_id,role) values(new_league.id,uid,'owner');
  return to_jsonb(new_league);
end $$;
revoke all on function public.market_create_friend_league(text,text) from public,anon,authenticated,service_role;
grant execute on function public.market_create_friend_league(text,text) to authenticated;

create or replace view public.market_friend_league_leaderboard as
select
  league.id as league_id,league.name as league_name,league.league_code,league.owner_user_id,
  member.user_id,profile.username,
  coalesce(portfolio.total_portfolio_value_minor,100000000) as total_account_value,
  coalesce(portfolio.realised_profit_minor,0) as realized_profit_loss,
  coalesce(portfolio.current_holdings_value_minor,0) as portfolio_value,
  rank() over(partition by league.id order by
    case league.score_mode
      when 'weekly_gain' then coalesce(board.weekly_change_minor,0)
      when 'realised_profit' then coalesce(portfolio.realised_profit_minor,0)
      else coalesce(portfolio.total_portfolio_value_minor,100000000)
    end desc,member.joined_at asc)::integer as rank,
  league.score_mode,
  case league.score_mode
    when 'weekly_gain' then coalesce(board.weekly_change_minor,0)
    when 'realised_profit' then coalesce(portfolio.realised_profit_minor,0)
    else coalesce(portfolio.total_portfolio_value_minor,100000000)
  end as score_value
from public.market_friend_leagues league
join public.market_friend_league_members member on member.league_id=league.id
left join public.profiles profile on profile.id=member.user_id
left join public.market_portfolios portfolio on portfolio.user_id=member.user_id
left join public.market_public_leaderboard board on board.portfolio_id=portfolio.id
where league.is_active and public.market_is_friend_league_member(league.id);
alter view public.market_friend_league_leaderboard set (security_invoker=true);
revoke all on table public.market_friend_league_leaderboard from public,anon,authenticated;
grant select on table public.market_friend_league_leaderboard to authenticated;

create index if not exists prediction_competitions_active_idx on public.prediction_competitions(is_active,league_name);
create index if not exists quiz_results_quiz_completed_idx on public.quiz_results(quiz_id,completed_at desc,user_id);
create index if not exists quiz_friend_leagues_owner_idx on public.quiz_friend_leagues(owner_user_id,created_at desc);
