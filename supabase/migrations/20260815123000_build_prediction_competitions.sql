-- Turn Predictions into a server-scored competition. The browser may choose
-- picks, but it cannot choose results, points, bonuses or rewards.

update public.market_store_items
set description = case item_key
  when 'title_early_adopter' then 'Show "Founder Beta" beneath your username.'
  when 'title_value_hunter' then 'Show "Value Hunter" beneath your username.'
  when 'title_market_mind' then 'Show "Market Mind" beneath your username.'
  when 'title_club_legend' then 'Show "Club Legend" beneath your username.'
  else description
end
where item_key in ('title_early_adopter','title_value_hunter','title_market_mind','title_club_legend');

create table if not exists public.prediction_fixtures (
  fixture_id text primary key,
  league_key text not null check (league_key in ('premier-league','la-liga','ligue-1')),
  league_name text not null,
  gameweek_key text not null,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','postponed','cancelled')),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  is_derby boolean not null default false,
  scoring_completed_at timestamptz,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((status <> 'completed') or (home_score is not null and away_score is not null))
);

alter table public.predictions add column if not exists confidence smallint not null default 3;
alter table public.predictions add column if not exists points_awarded integer;
alter table public.predictions add column if not exists scored_at timestamptz;
alter table public.predictions drop constraint if exists predictions_confidence_check;
alter table public.predictions add constraint predictions_confidence_check check (confidence between 1 and 5);
alter table public.predictions drop constraint if exists predictions_pick_check;
alter table public.predictions add constraint predictions_pick_check check (pick in ('home','draw','away'));

create index if not exists prediction_fixtures_kickoff_idx on public.prediction_fixtures(kickoff_at,league_key);
create index if not exists prediction_fixtures_gameweek_idx on public.prediction_fixtures(gameweek_key,status);
create index if not exists predictions_fixture_scored_idx on public.predictions(fixture_id,scored_at);
create index if not exists predictions_user_scored_idx on public.predictions(user_id,scored_at desc);

alter table public.prediction_fixtures enable row level security;
drop policy if exists prediction_fixtures_public_read on public.prediction_fixtures;
create policy prediction_fixtures_public_read on public.prediction_fixtures for select to anon,authenticated using (true);
revoke all on table public.prediction_fixtures from public,anon,authenticated;
grant select on table public.prediction_fixtures to anon,authenticated;
grant all on table public.prediction_fixtures to service_role;

drop policy if exists "Users can insert own predictions" on public.predictions;
drop policy if exists "Users can update own predictions" on public.predictions;
revoke insert,update,delete on table public.predictions from anon,authenticated;
grant all on table public.predictions to service_role;

create table if not exists public.prediction_leagues (
  id uuid primary key default gen_random_uuid(),
  league_code text not null unique check (league_code ~ '^[A-Z0-9]{8}$'),
  name text not null check (char_length(name) between 3 and 40),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  rule_mode text not null default 'all' check (rule_mode in ('all','random_1','random_5')),
  league_keys text[] not null default array['premier-league','la-liga','ligue-1']::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (cardinality(league_keys) between 1 and 3),
  check (league_keys <@ array['premier-league','la-liga','ligue-1']::text[])
);

create table if not exists public.prediction_league_members (
  league_id uuid not null references public.prediction_leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (league_id,user_id)
);

create table if not exists public.prediction_league_fixtures (
  league_id uuid not null references public.prediction_leagues(id) on delete cascade,
  fixture_id text not null references public.prediction_fixtures(fixture_id) on delete cascade,
  gameweek_key text not null,
  created_at timestamptz not null default now(),
  primary key (league_id,fixture_id)
);

create table if not exists public.prediction_perfect_week_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek_key text not null,
  credits_awarded integer not null default 25 check (credits_awarded >= 0),
  awarded_at timestamptz not null default now(),
  primary key (user_id,gameweek_key)
);

create index if not exists prediction_leagues_owner_idx on public.prediction_leagues(owner_user_id);
create index if not exists prediction_league_members_user_idx on public.prediction_league_members(user_id,joined_at desc);
create index if not exists prediction_league_fixtures_round_idx on public.prediction_league_fixtures(league_id,gameweek_key);

alter table public.prediction_leagues enable row level security;
alter table public.prediction_league_members enable row level security;
alter table public.prediction_league_fixtures enable row level security;
alter table public.prediction_perfect_week_rewards enable row level security;

create or replace function public.prediction_is_league_member(p_league_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.prediction_league_members m where m.league_id=p_league_id and m.user_id=(select auth.uid()))
$$;

drop policy if exists prediction_leagues_member_read on public.prediction_leagues;
create policy prediction_leagues_member_read on public.prediction_leagues for select to authenticated using (public.prediction_is_league_member(id));
drop policy if exists prediction_league_members_member_read on public.prediction_league_members;
create policy prediction_league_members_member_read on public.prediction_league_members for select to authenticated using (public.prediction_is_league_member(league_id));
drop policy if exists prediction_league_fixtures_member_read on public.prediction_league_fixtures;
create policy prediction_league_fixtures_member_read on public.prediction_league_fixtures for select to authenticated using (public.prediction_is_league_member(league_id));
drop policy if exists prediction_perfect_rewards_owner_read on public.prediction_perfect_week_rewards;
create policy prediction_perfect_rewards_owner_read on public.prediction_perfect_week_rewards for select to authenticated using ((select auth.uid())=user_id);

revoke all on table public.prediction_leagues,public.prediction_league_members,public.prediction_league_fixtures,public.prediction_perfect_week_rewards from public,anon,authenticated;
grant select on table public.prediction_leagues,public.prediction_league_members,public.prediction_league_fixtures,public.prediction_perfect_week_rewards to authenticated;
grant all on table public.prediction_leagues,public.prediction_league_members,public.prediction_league_fixtures,public.prediction_perfect_week_rewards to service_role;

create or replace function public.prediction_create_league(p_name text,p_rule_mode text,p_league_keys text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); clean_name text:=btrim(p_name); clean_keys text[]; candidate text; created public.prediction_leagues;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(clean_name)<3 or char_length(clean_name)>40 then raise exception 'LEAGUE_NAME_INVALID'; end if;
  if p_rule_mode not in ('all','random_1','random_5') then raise exception 'LEAGUE_RULE_INVALID'; end if;
  select array_agg(distinct key order by key) into clean_keys from unnest(p_league_keys) key where key in ('premier-league','la-liga','ligue-1');
  if coalesce(cardinality(clean_keys),0)=0 then raise exception 'LEAGUE_SCOPE_REQUIRED'; end if;
  loop candidate:=upper(substr(md5(gen_random_uuid()::text),1,8)); exit when not exists(select 1 from public.prediction_leagues where league_code=candidate); end loop;
  insert into public.prediction_leagues(league_code,name,owner_user_id,rule_mode,league_keys) values(candidate,clean_name,uid,p_rule_mode,clean_keys) returning * into created;
  insert into public.prediction_league_members(league_id,user_id,role) values(created.id,uid,'owner');
  return to_jsonb(created);
end $$;

create or replace function public.prediction_join_league(p_league_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); target public.prediction_leagues;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.prediction_leagues where league_code=upper(btrim(p_league_code)) and is_active limit 1;
  if not found then raise exception 'LEAGUE_NOT_FOUND'; end if;
  insert into public.prediction_league_members(league_id,user_id,role) values(target.id,uid,case when target.owner_user_id=uid then 'owner' else 'member' end) on conflict do nothing;
  return to_jsonb(target);
end $$;

create or replace function public.prediction_leave_league(p_league_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); removed integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.prediction_leagues where id=p_league_id and owner_user_id=uid) then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  delete from public.prediction_league_members where league_id=p_league_id and user_id=uid;
  get diagnostics removed = row_count;
  return jsonb_build_object('left',removed>0,'league_id',p_league_id);
end $$;

create or replace function public.prediction_save_picks(p_picks jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); item jsonb; fixture public.prediction_fixtures; saved integer:=0; chosen text; confidence_value integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_picks)<>'array' or jsonb_array_length(p_picks)=0 or jsonb_array_length(p_picks)>50 then raise exception 'PICKS_INVALID'; end if;
  for item in select value from jsonb_array_elements(p_picks) loop
    chosen:=item->>'pick'; confidence_value:=coalesce((item->>'confidence')::integer,3);
    if chosen not in ('home','draw','away') or confidence_value not between 1 and 5 then raise exception 'PICK_INVALID'; end if;
    select * into fixture from public.prediction_fixtures where fixture_id=item->>'fixture_id' for share;
    if not found then raise exception 'FIXTURE_NOT_FOUND'; end if;
    if fixture.status<>'scheduled' or fixture.kickoff_at<=now() then raise exception 'PICKS_LOCKED'; end if;
    insert into public.predictions(user_id,prediction_set,fixture_id,home_team,away_team,pick,confidence,updated_at)
    values(uid,fixture.gameweek_key,fixture.fixture_id,fixture.home_team,fixture.away_team,chosen,confidence_value,now())
    on conflict(user_id,prediction_set,fixture_id) do update set pick=excluded.pick,confidence=excluded.confidence,home_team=excluded.home_team,away_team=excluded.away_team,updated_at=now()
    where public.predictions.scored_at is null;
    saved:=saved+1;
  end loop;
  return jsonb_build_object('ok',true,'saved',saved);
end $$;

create or replace function public.prediction_refresh_league_fixtures()
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare league_row public.prediction_leagues; week_key text; limit_count integer; inserted integer:=0; affected integer;
begin
  for league_row in select * from public.prediction_leagues where is_active loop
    for week_key in select distinct f.gameweek_key from public.prediction_fixtures f where f.kickoff_at>now() and f.league_key=any(league_row.league_keys) loop
      if exists(select 1 from public.prediction_league_fixtures where league_id=league_row.id and gameweek_key=week_key) then continue; end if;
      limit_count:=case league_row.rule_mode when 'random_1' then 1 when 'random_5' then 5 else 100 end;
      insert into public.prediction_league_fixtures(league_id,fixture_id,gameweek_key)
      select league_row.id,f.fixture_id,f.gameweek_key from public.prediction_fixtures f
      where f.gameweek_key=week_key and f.kickoff_at>now() and f.league_key=any(league_row.league_keys)
      order by md5(league_row.id::text||':'||f.fixture_id) limit limit_count on conflict do nothing;
      get diagnostics affected = row_count; inserted:=inserted+affected;
    end loop;
  end loop;
  return inserted;
end $$;

create or replace function public.prediction_score_completed_fixtures()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare fixture_row public.prediction_fixtures; result_pick text; total_picks integer; correct_picks integer; difficulty_bonus integer; processed integer:=0; rewarded integer:=0; reward_row record;
begin
  for fixture_row in select * from public.prediction_fixtures where status='completed' and scoring_completed_at is null order by kickoff_at for update skip locked loop
    result_pick:=case when fixture_row.home_score>fixture_row.away_score then 'home' when fixture_row.away_score>fixture_row.home_score then 'away' else 'draw' end;
    select count(*),count(*) filter(where p.pick=result_pick) into total_picks,correct_picks
    from public.predictions p where p.fixture_id=fixture_row.fixture_id and p.created_at<fixture_row.kickoff_at;
    difficulty_bonus:=case when total_picks=0 or correct_picks=0 then 0 when correct_picks::numeric/total_picks<0.25 then 2 when correct_picks::numeric/total_picks<0.40 then 1 else 0 end;
    update public.predictions p set points_awarded=case when p.pick=result_pick then 3+(case when fixture_row.is_derby then 1 else 0 end)+difficulty_bonus else 0 end,scored_at=now(),updated_at=now()
    where p.fixture_id=fixture_row.fixture_id and p.created_at<fixture_row.kickoff_at and p.scored_at is null;
    update public.prediction_fixtures f set scoring_completed_at=now() where f.fixture_id=fixture_row.fixture_id;
    processed:=processed+1;
  end loop;
  for reward_row in
    select p.user_id,f.gameweek_key,count(*) picks,count(*) filter(where p.points_awarded>=3) correct
    from public.predictions p join public.prediction_fixtures f on f.fixture_id=p.fixture_id
    where p.scored_at is not null and not exists(select 1 from public.prediction_fixtures open_fixture where open_fixture.gameweek_key=f.gameweek_key and open_fixture.status not in ('completed','cancelled','postponed'))
    group by p.user_id,f.gameweek_key having count(*)>=5 and count(*)=count(*) filter(where p.points_awarded>=3)
  loop
    insert into public.prediction_perfect_week_rewards(user_id,gameweek_key) values(reward_row.user_id,reward_row.gameweek_key) on conflict do nothing;
    if found then
      insert into public.market_reward_wallets(user_id) values(reward_row.user_id) on conflict do nothing;
      update public.market_reward_wallets set balance=balance+25,lifetime_earned=lifetime_earned+25,updated_at=now() where user_id=reward_row.user_id;
      rewarded:=rewarded+1;
    end if;
  end loop;
  return jsonb_build_object('fixtures_scored',processed,'perfect_week_rewards',rewarded);
end $$;

create or replace function public.prediction_get_public_leaderboard(p_period text default 'all')
returns table(user_id uuid,username text,points bigint,picks_scored integer,correct_picks integer,confidence_won integer,last_scored_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
#variable_conflict use_column
declare start_at timestamptz;
begin
  if p_period not in ('daily','weekly','monthly','season','all') then raise exception 'PERIOD_INVALID'; end if;
  start_at:=case p_period when 'daily' then date_trunc('day',now()) when 'weekly' then date_trunc('week',now()) when 'monthly' then date_trunc('month',now()) when 'season' then date_trunc('year',now()) else null end;
  return query select p.user_id,profile.username,sum(coalesce(p.points_awarded,0))::bigint,
    count(*) filter(where p.scored_at is not null)::integer,count(*) filter(where p.points_awarded>=3)::integer,
    coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0)::integer,max(p.scored_at)
  from public.predictions p join public.profiles profile on profile.id=p.user_id
  where p.scored_at is not null and profile.username is not null and (start_at is null or p.scored_at>=start_at)
  group by p.user_id,profile.username order by sum(coalesce(p.points_awarded,0)) desc,coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0) desc limit 100;
end $$;

create or replace function public.prediction_get_league_leaderboard(p_league_id uuid)
returns table(user_id uuid,username text,points bigint,picks_scored integer,correct_picks integer,rank bigint)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
#variable_conflict use_column
begin
  if not public.prediction_is_league_member(p_league_id) then raise exception 'LEAGUE_NOT_FOUND'; end if;
  return query with scores as (
    select m.user_id,coalesce(profile.username,'Anonymous') username,coalesce(sum(p.points_awarded),0)::bigint points,
      count(p.id) filter(where p.scored_at is not null)::integer picks_scored,count(p.id) filter(where p.points_awarded>=3)::integer correct_picks,
      coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0)::integer confidence_won,m.joined_at
    from public.prediction_league_members m left join public.profiles profile on profile.id=m.user_id
    left join public.prediction_league_fixtures lf on lf.league_id=m.league_id
    left join public.predictions p on p.fixture_id=lf.fixture_id and p.user_id=m.user_id
    where m.league_id=p_league_id group by m.user_id,profile.username,m.joined_at
  ) select scores.user_id,scores.username,scores.points,scores.picks_scored,scores.correct_picks,
      rank() over(order by scores.points desc,scores.confidence_won desc,scores.joined_at)
    from scores order by scores.points desc,scores.confidence_won desc,scores.joined_at;
end $$;

revoke all on function public.prediction_is_league_member(uuid),public.prediction_create_league(text,text,text[]),public.prediction_join_league(text),public.prediction_leave_league(uuid),public.prediction_save_picks(jsonb),public.prediction_refresh_league_fixtures(),public.prediction_score_completed_fixtures(),public.prediction_get_public_leaderboard(text),public.prediction_get_league_leaderboard(uuid) from public,anon,authenticated;
grant execute on function public.prediction_create_league(text,text,text[]),public.prediction_join_league(text),public.prediction_leave_league(uuid),public.prediction_save_picks(jsonb) to authenticated;
grant execute on function public.prediction_is_league_member(uuid) to authenticated;
grant execute on function public.prediction_refresh_league_fixtures(),public.prediction_score_completed_fixtures() to service_role;
grant execute on function public.prediction_get_public_leaderboard(text) to anon,authenticated;
grant execute on function public.prediction_get_league_leaderboard(uuid) to authenticated;

alter function public.prediction_create_league(text,text,text[]) set statement_timeout='5s';
alter function public.prediction_join_league(text) set statement_timeout='5s';
alter function public.prediction_leave_league(uuid) set statement_timeout='5s';
alter function public.prediction_save_picks(jsonb) set statement_timeout='5s';
alter function public.prediction_refresh_league_fixtures() set statement_timeout='15s';
alter function public.prediction_score_completed_fixtures() set statement_timeout='15s';
