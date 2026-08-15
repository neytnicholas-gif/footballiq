-- Optional, coarse location lets players choose a country or continent table.
-- It is never inferred from IP and is hidden unless the player opts in.

create table if not exists public.prediction_player_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  continent_code text check (continent_code is null or continent_code in ('AF','AN','AS','EU','NA','OC','SA')),
  share_location boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.prediction_player_settings enable row level security;
drop policy if exists prediction_player_settings_owner_read on public.prediction_player_settings;
create policy prediction_player_settings_owner_read on public.prediction_player_settings for select to authenticated using ((select auth.uid())=user_id);
revoke all on table public.prediction_player_settings from public,anon,authenticated;
grant select on table public.prediction_player_settings to authenticated;
grant all on table public.prediction_player_settings to service_role;

create or replace function public.prediction_set_location(p_country_code text,p_continent_code text,p_share_location boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); clean_country text:=upper(nullif(btrim(p_country_code),'')); clean_continent text:=upper(nullif(btrim(p_continent_code),'')); saved public.prediction_player_settings;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if clean_country is not null and clean_country !~ '^[A-Z]{2}$' then raise exception 'COUNTRY_INVALID'; end if;
  if clean_continent is not null and clean_continent not in ('AF','AN','AS','EU','NA','OC','SA') then raise exception 'CONTINENT_INVALID'; end if;
  if p_share_location and (clean_country is null or clean_continent is null) then raise exception 'LOCATION_REQUIRED'; end if;
  insert into public.prediction_player_settings(user_id,country_code,continent_code,share_location,updated_at)
  values(uid,clean_country,clean_continent,p_share_location,now())
  on conflict(user_id) do update set country_code=excluded.country_code,continent_code=excluded.continent_code,share_location=excluded.share_location,updated_at=now()
  returning * into saved;
  return to_jsonb(saved);
end $$;

drop function if exists public.prediction_get_public_leaderboard(text);
create function public.prediction_get_public_leaderboard(p_period text default 'all',p_scope text default 'global',p_scope_value text default null)
returns table(user_id uuid,username text,points bigint,picks_scored integer,correct_picks integer,confidence_won integer,last_scored_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
#variable_conflict use_column
declare start_at timestamptz; clean_scope_value text:=upper(nullif(btrim(p_scope_value),''));
begin
  if p_period not in ('daily','weekly','monthly','season','all') then raise exception 'PERIOD_INVALID'; end if;
  if p_scope not in ('global','country','continent') then raise exception 'SCOPE_INVALID'; end if;
  if p_scope<>'global' and clean_scope_value is null then raise exception 'SCOPE_VALUE_REQUIRED'; end if;
  start_at:=case p_period when 'daily' then date_trunc('day',now()) when 'weekly' then date_trunc('week',now()) when 'monthly' then date_trunc('month',now()) when 'season' then date_trunc('year',now()) else null end;
  return query select p.user_id,profile.username,sum(coalesce(p.points_awarded,0))::bigint,
    count(*) filter(where p.scored_at is not null)::integer,count(*) filter(where p.points_awarded>=3)::integer,
    coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0)::integer,max(p.scored_at)
  from public.predictions p
  join public.profiles profile on profile.id=p.user_id
  left join public.prediction_player_settings settings on settings.user_id=p.user_id
  where p.scored_at is not null and profile.username is not null and (start_at is null or p.scored_at>=start_at)
    and (p_scope='global' or (
      settings.share_location and ((p_scope='country' and settings.country_code=clean_scope_value) or (p_scope='continent' and settings.continent_code=clean_scope_value))
    ))
  group by p.user_id,profile.username
  order by sum(coalesce(p.points_awarded,0)) desc,coalesce(sum(p.confidence) filter(where p.points_awarded>=3),0) desc
  limit 100;
end $$;

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
  perform public.prediction_refresh_league_fixtures();
  return to_jsonb(created);
end $$;

revoke all on function public.prediction_set_location(text,text,boolean),public.prediction_get_public_leaderboard(text,text,text) from public,anon,authenticated;
grant execute on function public.prediction_set_location(text,text,boolean) to authenticated;
grant execute on function public.prediction_get_public_leaderboard(text,text,text) to anon,authenticated;
alter function public.prediction_set_location(text,text,boolean) set statement_timeout='5s';
