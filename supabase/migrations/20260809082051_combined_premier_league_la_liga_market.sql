-- One FootballIQ portfolio can trade players from every catalogue activated in
-- the same game universe. The portfolio remains anchored to the configured
-- game season, while player eligibility is controlled by this private mapping.
create table if not exists public.market_active_catalogues (
  catalogue_id uuid primary key references public.market_catalogues(id) on delete restrict,
  season_id text not null references public.market_seasons(id) on delete restrict,
  competition_key text not null check (length(btrim(competition_key)) > 0),
  activated_at timestamptz not null default now(),
  unique (season_id, catalogue_id)
);

alter table public.market_active_catalogues enable row level security;
revoke all on table public.market_active_catalogues from anon, authenticated;
grant all on table public.market_active_catalogues to service_role;

insert into public.market_active_catalogues (catalogue_id, season_id, competition_key)
select c.id, c.season_id, s.competition_key
from public.market_catalogues c
join public.market_settings ms on ms.active_catalogue_id = c.id
join public.market_seasons s on s.id = c.season_id
where c.status = 'active'
on conflict (catalogue_id) do update set
  season_id = excluded.season_id,
  competition_key = excluded.competition_key;

create or replace function public.market_buy_player(
  p_player_id uuid,
  p_idempotency_key text,
  p_expected_price_minor integer
) returns public.market_transactions
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid(); today_brussels date := public.market_brussels_date(now());
  s public.market_settings; p public.market_portfolios; player public.market_players;
  daily public.market_daily_limits; tx public.market_transactions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key, ''))) = 0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into s from public.market_settings where id=1 for share;
  select mp.* into player from public.market_players mp
  join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.id=p_player_id for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if not player.is_available then raise exception 'PLAYER_UNAVAILABLE'; end if;
  if p_expected_price_minor is distinct from player.current_price_minor then raise exception 'STALE_PRICE'; end if;
  select t.* into tx from public.market_transactions t join public.market_portfolios x on x.id=t.portfolio_id
    where t.idempotency_key=p_idempotency_key;
  if found then
    if tx.player_id<>p_player_id or tx.transaction_type<>'buy' or not exists(select 1 from public.market_portfolios x where x.id=tx.portfolio_id and x.user_id=uid)
      then raise exception 'IDEMPOTENCY_KEY_CONFLICT'; end if;
    return tx;
  end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then p := public.market_create_or_get_portfolio(); end if;
  if exists(select 1 from public.market_holdings where portfolio_id=p.id and player_id=p_player_id) then raise exception 'ALREADY_OWNED'; end if;
  if (select count(*) from public.market_holdings where portfolio_id=p.id)>=s.maximum_holdings then raise exception 'MAX_HOLDINGS'; end if;
  if p.cash_balance_minor<player.current_price_minor then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into public.market_daily_limits(portfolio_id,activity_date) values(p.id,today_brussels) on conflict do nothing;
  select * into daily from public.market_daily_limits where portfolio_id=p.id and activity_date=today_brussels for update;
  if daily.purchases_count>=3 then raise exception 'DAILY_PURCHASE_LIMIT'; end if;
  insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor,unrealised_profit_minor)
    values(p.id,player.id,1,player.current_price_minor,player.current_price_minor,0);
  update public.market_portfolios set cash_balance_minor=cash_balance_minor-player.current_price_minor where id=p.id;
  update public.market_daily_limits set purchases_count=purchases_count+1 where id=daily.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,holding_value_before_minor,holding_value_after_minor,idempotency_key)
    values(p.id,player.id,'buy',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor-player.current_price_minor,0,player.current_price_minor,p_idempotency_key)
    returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  return tx;
end $$;

create or replace function public.market_sell_player(p_player_id uuid,p_idempotency_key text)
returns public.market_transactions language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); today_brussels date:=public.market_brussels_date(now()); s public.market_settings;
  p public.market_portfolios; player public.market_players; holding public.market_holdings; daily public.market_daily_limits; tx public.market_transactions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select t.* into tx from public.market_transactions t join public.market_portfolios x on x.id=t.portfolio_id where t.idempotency_key=p_idempotency_key;
  if found then
    if tx.player_id<>p_player_id or tx.transaction_type<>'sell' or not exists(select 1 from public.market_portfolios x where x.id=tx.portfolio_id and x.user_id=uid)
      then raise exception 'IDEMPOTENCY_KEY_CONFLICT'; end if;
    return tx;
  end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where mp.id=p_player_id for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into holding from public.market_holdings where portfolio_id=p.id and player_id=p_player_id for update;
  if not found then raise exception 'NOT_OWNED'; end if;
  insert into public.market_daily_limits(portfolio_id,activity_date) values(p.id,today_brussels) on conflict do nothing;
  select * into daily from public.market_daily_limits where portfolio_id=p.id and activity_date=today_brussels for update;
  if daily.sales_count>=3 then raise exception 'DAILY_SALE_LIMIT'; end if;
  delete from public.market_holdings where id=holding.id;
  update public.market_portfolios set cash_balance_minor=cash_balance_minor+player.current_price_minor,
    realised_profit_minor=realised_profit_minor+(player.current_price_minor-holding.purchase_price_minor) where id=p.id;
  update public.market_daily_limits set sales_count=sales_count+1 where id=daily.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,holding_value_before_minor,holding_value_after_minor,idempotency_key)
    values(p.id,player.id,'sell',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor+player.current_price_minor,holding.current_value_minor,0,p_idempotency_key)
    returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  return tx;
end $$;

create or replace function public.market_buy_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare player public.market_players; tx public.market_transactions; position_count integer; p public.market_portfolios; s public.market_settings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id where mp.slug=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into s from public.market_settings where id=1;
  select * into p from public.market_portfolios where user_id=auth.uid() and season_id=s.active_season_id;
  if p.id is not null then
    select count(*) into position_count from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id and mp.position_group=player.position_group;
    if (player.position_group='GK' and position_count>=1) or (player.position_group='DEF' and position_count>=4) or (player.position_group='MID' and position_count>=3) or (player.position_group='FWD' and position_count>=3) then raise exception 'FORMATION_LIMIT'; end if;
  end if;
  tx:=public.market_buy_player(player.id,p_idempotency_key,player.current_price_minor);
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',p_player_slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare player public.market_players; tx public.market_transactions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id where mp.slug=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  tx:=public.market_sell_player(player.id,p_idempotency_key);
  return jsonb_build_object('ok',true,'message','Sell executed','transaction_id',tx.id,'player_slug',p_player_slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_toggle_watchlist(p_player_slug text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare uid uuid:=auth.uid(); player public.market_players;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id where mp.slug=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists(select 1 from public.market_watchlist where user_id=uid and player_id=player.id) then
    delete from public.market_watchlist where user_id=uid and player_id=player.id; return jsonb_build_object('watchlisted',false);
  end if;
  insert into public.market_watchlist(user_id,player_id) values(uid,player.id); return jsonb_build_object('watchlisted',true);
end $$;

grant execute on function public.market_buy_player(text,text) to authenticated;
grant execute on function public.market_sell_player(text,text) to authenticated;
grant execute on function public.market_toggle_watchlist(text) to authenticated;

create or replace function public.market_import_guest_squad(p_player_slugs text[],p_watchlist_slugs text[] default '{}'::text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios;
  requested_count integer; resolved_count integer; watchlist_count integer; total_cost integer;
  gk_count integer; def_count integer; mid_count integer; fwd_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1;
  if s.active_season_id is null then raise exception 'ACTIVE_MARKET_NOT_SET'; end if;
  if exists(select 1 from public.market_guest_imports where user_id=uid) then return jsonb_build_object('ok',true,'imported',false,'reason','already_imported'); end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id;
  if p.id is not null and (exists(select 1 from public.market_holdings where portfolio_id=p.id) or exists(select 1 from public.market_transactions where portfolio_id=p.id)) then
    return jsonb_build_object('ok',true,'imported',false,'reason','account_already_initialized');
  end if;
  select count(*) into requested_count from (select distinct btrim(x) slug from unnest(coalesce(p_player_slugs,'{}'::text[])) x where btrim(x)<>'') q;
  if requested_count>s.maximum_holdings then raise exception 'PORTFOLIO_LIMIT'; end if;
  if requested_count<>cardinality(coalesce(p_player_slugs,'{}'::text[])) then raise exception 'DUPLICATE_OR_EMPTY_PLAYER'; end if;
  select count(*),coalesce(sum(mp.current_price_minor),0),count(*) filter(where mp.position_group='GK'),count(*) filter(where mp.position_group='DEF'),count(*) filter(where mp.position_group='MID'),count(*) filter(where mp.position_group='FWD')
  into resolved_count,total_cost,gk_count,def_count,mid_count,fwd_count
  from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.slug=any(coalesce(p_player_slugs,'{}'::text[])) and mp.is_available;
  if resolved_count<>requested_count then raise exception 'PLAYER_NOT_FOUND_OR_UNAVAILABLE'; end if;
  if gk_count>1 or def_count>4 or mid_count>3 or fwd_count>3 then raise exception 'FORMATION_LIMIT'; end if;
  if total_cost>s.starting_balance_minor then raise exception 'INSUFFICIENT_FUNDS'; end if;
  if p.id is null then p:=public.market_create_or_get_portfolio(); end if;
  insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor,unrealised_profit_minor,purchased_at,updated_at)
  select p.id,mp.id,1,mp.current_price_minor,mp.current_price_minor,0,now(),now() from public.market_players mp
  join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.slug=any(coalesce(p_player_slugs,'{}'::text[]));
  update public.market_portfolios set cash_balance_minor=s.starting_balance_minor-total_cost,updated_at=now() where id=p.id;
  insert into public.market_watchlist(user_id,player_id)
  select uid,mp.id from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  join (select distinct btrim(x) slug from unnest(coalesce(p_watchlist_slugs,'{}'::text[])) x where btrim(x)<>'') q on q.slug=mp.slug on conflict do nothing;
  get diagnostics watchlist_count=row_count;
  perform public.market_recalculate_portfolio_totals(p.id);
  insert into public.market_guest_imports(user_id,imported_holdings,imported_watchlist) values(uid,requested_count,watchlist_count);
  return jsonb_build_object('ok',true,'imported',true,'holdings',requested_count,'watchlist',watchlist_count,'available_balance',s.starting_balance_minor-total_cost,'pricing','current_market_value');
end $$;
grant execute on function public.market_import_guest_squad(text[],text[]) to authenticated;
