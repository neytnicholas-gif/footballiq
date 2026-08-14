-- Keep the public leaderboard useful without leaking players who hide market stats.
-- Portfolio totals are synced at transaction commit so readers never see a half-finished trade.

create or replace function public.market_sync_public_leaderboard_for_portfolio(p_portfolio_id uuid)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '3s'
set lock_timeout = '1s'
as $$
declare
  portfolio_row public.market_portfolios;
  display_name text;
  show_market_stats boolean;
  weekly_change bigint;
begin
  select * into portfolio_row
  from public.market_portfolios
  where id = p_portfolio_id;

  if not found then
    delete from public.market_public_leaderboard where portfolio_id = p_portfolio_id;
    return;
  end if;

  select coalesce(preferences.show_market_stats, true)
  into show_market_stats
  from (select true) seed
  left join public.market_profile_preferences preferences
    on preferences.user_id = portfolio_row.user_id;

  if not coalesce(show_market_stats, true) then
    delete from public.market_public_leaderboard where portfolio_id = portfolio_row.id;
    return;
  end if;

  select left(coalesce(nullif(btrim(profile.username), ''), 'Early Shout player'), 40)
  into display_name
  from (select true) seed
  left join public.profiles profile on profile.id = portfolio_row.user_id;

  select coalesce(leaderboard.weekly_change_minor, 0)
  into weekly_change
  from (select true) seed
  left join public.market_public_leaderboard leaderboard
    on leaderboard.portfolio_id = portfolio_row.id;

  perform public.market_upsert_public_leaderboard_row(
    portfolio_row.id,
    coalesce(display_name, 'Early Shout player'),
    coalesce(weekly_change, 0)
  );
end;
$$;

revoke all on function public.market_sync_public_leaderboard_for_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.market_sync_public_leaderboard_for_portfolio(uuid) to service_role;

create or replace function public.market_sync_public_leaderboard_portfolio_trigger()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '3s'
set lock_timeout = '1s'
as $$
begin
  perform public.market_sync_public_leaderboard_for_portfolio(new.id);
  return new;
end;
$$;

create or replace function public.market_sync_public_leaderboard_user_trigger()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '3s'
set lock_timeout = '1s'
as $$
declare
  portfolio_id uuid;
  affected_user_id uuid;
begin
  affected_user_id := coalesce(
    nullif(to_jsonb(new) ->> 'user_id', '')::uuid,
    nullif(to_jsonb(old) ->> 'user_id', '')::uuid,
    nullif(to_jsonb(new) ->> 'id', '')::uuid,
    nullif(to_jsonb(old) ->> 'id', '')::uuid
  );
  for portfolio_id in
    select portfolio.id
    from public.market_portfolios portfolio
    where portfolio.user_id = affected_user_id
  loop
    perform public.market_sync_public_leaderboard_for_portfolio(portfolio_id);
  end loop;
  return coalesce(new, old);
end;
$$;

revoke all on function public.market_sync_public_leaderboard_portfolio_trigger() from public, anon, authenticated;
revoke all on function public.market_sync_public_leaderboard_user_trigger() from public, anon, authenticated;

drop trigger if exists market_portfolios_sync_public_leaderboard on public.market_portfolios;
create constraint trigger market_portfolios_sync_public_leaderboard
after insert or update on public.market_portfolios
deferrable initially deferred
for each row
execute function public.market_sync_public_leaderboard_portfolio_trigger();

drop trigger if exists market_preferences_sync_public_leaderboard on public.market_profile_preferences;
create trigger market_preferences_sync_public_leaderboard
after insert or update of show_market_stats on public.market_profile_preferences
for each row
execute function public.market_sync_public_leaderboard_user_trigger();

drop trigger if exists profiles_sync_public_leaderboard_name on public.profiles;
create trigger profiles_sync_public_leaderboard_name
after update of username on public.profiles
for each row
when (old.username is distinct from new.username)
execute function public.market_sync_public_leaderboard_user_trigger();

do $$
declare
  portfolio_id uuid;
begin
  for portfolio_id in select id from public.market_portfolios loop
    perform public.market_sync_public_leaderboard_for_portfolio(portfolio_id);
  end loop;
end;
$$;
