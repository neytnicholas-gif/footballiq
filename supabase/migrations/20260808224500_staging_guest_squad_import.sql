begin;

create or replace function public.market_import_guest_squad(
  p_player_slugs text[],
  p_watchlist_slugs text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  uid uuid := auth.uid();
  settings_row public.market_settings;
  portfolio_row public.market_portfolios;
  requested_count integer;
  resolved_count integer;
  watchlist_count integer;
  total_cost integer;
  gk_count integer;
  def_count integer;
  mid_count integer;
  fwd_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_season_id is null or settings_row.active_catalogue_id is null then
    raise exception 'ACTIVE_CATALOGUE_NOT_SET';
  end if;

  if exists (select 1 from public.market_guest_imports where user_id = uid) then
    return jsonb_build_object('ok', true, 'imported', false, 'reason', 'already_imported');
  end if;

  select * into portfolio_row
  from public.market_portfolios
  where user_id = uid and season_id = settings_row.active_season_id;

  if portfolio_row.id is not null and (
    exists (select 1 from public.market_holdings where portfolio_id = portfolio_row.id)
    or exists (select 1 from public.market_transactions where portfolio_id = portfolio_row.id)
  ) then
    return jsonb_build_object('ok', true, 'imported', false, 'reason', 'account_already_initialized');
  end if;

  select count(*) into requested_count
  from (select distinct btrim(slug) as slug from unnest(coalesce(p_player_slugs, '{}'::text[])) slug where btrim(slug) <> '') requested;

  if requested_count > settings_row.maximum_holdings then raise exception 'PORTFOLIO_LIMIT'; end if;
  if requested_count <> cardinality(coalesce(p_player_slugs, '{}'::text[])) then raise exception 'DUPLICATE_OR_EMPTY_PLAYER'; end if;

  select count(*), coalesce(sum(mp.current_price_minor), 0),
    count(*) filter (where mp.position_group = 'GK'),
    count(*) filter (where mp.position_group = 'DEF'),
    count(*) filter (where mp.position_group = 'MID'),
    count(*) filter (where mp.position_group = 'FWD')
  into resolved_count, total_cost, gk_count, def_count, mid_count, fwd_count
  from public.market_players mp
  where mp.slug = any(coalesce(p_player_slugs, '{}'::text[]))
    and mp.season_id = settings_row.active_season_id
    and mp.catalogue_id = settings_row.active_catalogue_id
    and mp.is_available;

  if resolved_count <> requested_count then raise exception 'PLAYER_NOT_FOUND_OR_UNAVAILABLE'; end if;
  if gk_count > 1 or def_count > 4 or mid_count > 3 or fwd_count > 3 then raise exception 'FORMATION_LIMIT'; end if;
  if total_cost > settings_row.starting_balance_minor then raise exception 'INSUFFICIENT_FUNDS'; end if;

  if portfolio_row.id is null then
    portfolio_row := public.market_create_or_get_portfolio();
  end if;

  insert into public.market_holdings (
    portfolio_id, player_id, quantity, purchase_price_minor,
    current_value_minor, unrealised_profit_minor, purchased_at, updated_at
  )
  select portfolio_row.id, mp.id, 1, mp.current_price_minor,
    mp.current_price_minor, 0, now(), now()
  from public.market_players mp
  where mp.slug = any(coalesce(p_player_slugs, '{}'::text[]))
    and mp.season_id = settings_row.active_season_id
    and mp.catalogue_id = settings_row.active_catalogue_id;

  update public.market_portfolios
  set cash_balance_minor = settings_row.starting_balance_minor - total_cost,
      updated_at = now()
  where id = portfolio_row.id;

  insert into public.market_watchlist (user_id, player_id)
  select uid, mp.id
  from public.market_players mp
  join (select distinct btrim(slug) as slug from unnest(coalesce(p_watchlist_slugs, '{}'::text[])) slug where btrim(slug) <> '') requested
    on requested.slug = mp.slug
  where mp.season_id = settings_row.active_season_id
    and mp.catalogue_id = settings_row.active_catalogue_id
  on conflict do nothing;

  get diagnostics watchlist_count = row_count;
  perform public.market_recalculate_portfolio_totals(portfolio_row.id);

  insert into public.market_guest_imports (user_id, imported_holdings, imported_watchlist)
  values (uid, requested_count, watchlist_count);

  return jsonb_build_object(
    'ok', true,
    'imported', true,
    'holdings', requested_count,
    'watchlist', watchlist_count,
    'available_balance', settings_row.starting_balance_minor - total_cost,
    'pricing', 'current_market_value'
  );
end;
$$;

-- Keep app-facing numeric IDs comfortably inside JavaScript's safe integer
-- range while the durable database identifiers remain UUIDs.
create or replace function public.market_app_portfolio_snapshot()
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into s from public.market_settings where id=1;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id;
  return jsonb_build_object(
    'portfolio', case when p.id is null then null else jsonb_build_object('user_id',uid,'available_balance',p.cash_balance_minor,'starting_balance',p.starting_balance_minor,'portfolio_value',p.current_holdings_value_minor,'total_account_value',p.total_portfolio_value_minor,'realized_profit_loss',p.realised_profit_minor,'created_at',p.created_at,'updated_at',p.updated_at) end,
    'holdings', coalesce((select jsonb_agg(jsonb_build_object('id',abs(hashtextextended(h.id::text,0)) % 2147483647,'user_id',uid,'player_id',mp.app_player_id,'acquisition_value',h.purchase_price_minor,'acquired_at',h.purchased_at,'current_value_snapshot',h.current_value_minor,'unrealized_profit_loss',h.unrealised_profit_minor) order by h.purchased_at) from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id),'[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object('id',abs(hashtextextended(t.id::text,0)) % 2147483647,'transaction_id',t.id,'user_id',uid,'player_id',mp.app_player_id,'transaction_type',t.transaction_type,'execution_value',t.executed_price_minor,'balance_before',t.balance_before_minor,'balance_after',t.balance_after_minor,'created_at',t.created_at,'trade_date_utc',(t.created_at at time zone 'UTC')::date,'idempotency_key',t.idempotency_key) order by t.created_at desc) from public.market_transactions t join public.market_players mp on mp.id=t.player_id where t.portfolio_id=p.id),'[]'::jsonb),
    'watchlist', coalesce((select jsonb_agg(mp.app_player_id) from public.market_watchlist w join public.market_players mp on mp.id=w.player_id where w.user_id=uid),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.market_import_guest_squad(text[],text[]) from public, anon;
grant execute on function public.market_import_guest_squad(text[],text[]) to authenticated;

commit;
