begin;

alter table public.market_players add column if not exists app_player_id bigint;
alter table public.market_players add column if not exists age integer check (age between 15 and 45);
create unique index if not exists market_players_app_player_id_key on public.market_players(app_player_id) where app_player_id is not null;

update public.market_settings set starting_balance_minor = 100000000, maximum_holdings = 11,
  maximum_daily_purchases = 3, maximum_daily_sales = 3 where id = 1;

-- The former manual-only approval constraint capped every active catalogue at
-- 50 rows. Preserve it for manual catalogues while allowing licensed provider
-- catalogues to contain the complete competition squad list.
alter table public.market_catalogues drop constraint if exists market_catalogues_manual_v1_evidence_check;
alter table public.market_catalogues add constraint market_catalogues_manual_v1_evidence_check check (
  source_type is distinct from 'manual' or status not in ('approved','active') or (
    manual_schema_version = 1 and record_count between 1 and 50 and validation_error_count = 0
    and unresolved_warning_count = 0 and approval_fingerprint = fingerprint and approved_at is not null
    and length(btrim(approved_by)) > 0 and approved_at >= validated_at
    and declaration_independently_selected and declaration_no_systematic_copy
    and declaration_original_values and declaration_manually_reviewed and declaration_identities_resolved
  )
) not valid;

-- Make the mature UUID trade RPC respect the configured 11-player limit.
do $$
declare ddl text;
begin
  select pg_get_functiondef('public.market_buy_player(uuid,text,integer)'::regprocedure) into ddl;
  if position('>= 5' in ddl) = 0 then raise exception 'Unexpected market_buy_player definition'; end if;
  execute replace(ddl, '>= 5', '>= settings_row.maximum_holdings');
end;
$$;

create table if not exists public.market_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.market_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);
alter table public.market_watchlist enable row level security;
drop policy if exists market_watchlist_owner_read on public.market_watchlist;
create policy market_watchlist_owner_read on public.market_watchlist for select to authenticated
using ((select auth.uid()) = user_id);
grant select on public.market_watchlist to authenticated;

create table if not exists public.market_guest_imports (
  user_id uuid primary key references auth.users(id) on delete cascade,
  imported_holdings integer not null default 0 check (imported_holdings between 0 and 11),
  imported_watchlist integer not null default 0 check (imported_watchlist >= 0),
  created_at timestamptz not null default now()
);
alter table public.market_guest_imports enable row level security;
drop policy if exists market_guest_imports_owner_read on public.market_guest_imports;
create policy market_guest_imports_owner_read on public.market_guest_imports for select to authenticated
using ((select auth.uid()) = user_id);
grant select on public.market_guest_imports to authenticated;

create or replace function public.market_buy_player(p_player_slug text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid := auth.uid(); player_row public.market_players; settings_row public.market_settings;
  portfolio_row public.market_portfolios; position_count integer; tx public.market_transactions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into settings_row from public.market_settings where id=1;
  select * into player_row from public.market_players where slug=p_player_slug
    and season_id=settings_row.active_season_id and catalogue_id=settings_row.active_catalogue_id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into portfolio_row from public.market_portfolios where user_id=uid and season_id=settings_row.active_season_id;
  if found then
    select count(*) into position_count from public.market_holdings h join public.market_players p on p.id=h.player_id
      where h.portfolio_id=portfolio_row.id and p.position_group=player_row.position_group;
    if (player_row.position_group='GK' and position_count>=1)
      or (player_row.position_group='DEF' and position_count>=4)
      or (player_row.position_group='MID' and position_count>=3)
      or (player_row.position_group='FWD' and position_count>=3) then
      raise exception 'FORMATION_LIMIT';
    end if;
  end if;
  tx := public.market_buy_player(player_row.id, p_idempotency_key, player_row.current_price_minor);
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',p_player_slug,'execution_value',tx.executed_price_minor);
end; $$;

create or replace function public.market_sell_player(p_player_slug text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare settings_row public.market_settings; player_row public.market_players; tx public.market_transactions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into settings_row from public.market_settings where id=1;
  select * into player_row from public.market_players where slug=p_player_slug and season_id=settings_row.active_season_id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  tx := public.market_sell_player(player_row.id, p_idempotency_key);
  return jsonb_build_object('ok',true,'message','Sell executed','transaction_id',tx.id,'player_slug',p_player_slug,'execution_value',tx.executed_price_minor);
end; $$;

create or replace function public.market_toggle_watchlist(p_player_slug text)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); settings_row public.market_settings; player_row public.market_players;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into settings_row from public.market_settings where id=1;
  select * into player_row from public.market_players where slug=p_player_slug and season_id=settings_row.active_season_id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists(select 1 from public.market_watchlist where user_id=uid and player_id=player_row.id) then
    delete from public.market_watchlist where user_id=uid and player_id=player_row.id;
    return jsonb_build_object('watchlisted',false);
  end if;
  insert into public.market_watchlist(user_id,player_id) values(uid,player_row.id);
  return jsonb_build_object('watchlisted',true);
end; $$;

create or replace function public.market_refresh_my_portfolio()
returns void language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.id into pid from public.market_portfolios p join public.market_settings s on s.active_season_id=p.season_id
    where p.user_id=uid and s.id=1;
  if pid is not null then perform public.market_recalculate_portfolio_totals(pid); end if;
end; $$;

create or replace function public.market_app_portfolio_snapshot()
returns jsonb language plpgsql security definer set search_path='pg_catalog','public' as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into s from public.market_settings where id=1;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id;
  return jsonb_build_object(
    'portfolio', case when p.id is null then null else jsonb_build_object('user_id',uid,'available_balance',p.cash_balance_minor,'starting_balance',p.starting_balance_minor,'portfolio_value',p.current_holdings_value_minor,'total_account_value',p.total_portfolio_value_minor,'realized_profit_loss',p.realised_profit_minor,'created_at',p.created_at,'updated_at',p.updated_at) end,
    'holdings', coalesce((select jsonb_agg(jsonb_build_object('id',abs(hashtextextended(h.id::text,0)),'user_id',uid,'player_id',mp.app_player_id,'acquisition_value',h.purchase_price_minor,'acquired_at',h.purchased_at,'current_value_snapshot',h.current_value_minor,'unrealized_profit_loss',h.unrealised_profit_minor) order by h.purchased_at) from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id),'[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object('id',abs(hashtextextended(t.id::text,0)),'transaction_id',t.id,'user_id',uid,'player_id',mp.app_player_id,'transaction_type',t.transaction_type,'execution_value',t.executed_price_minor,'balance_before',t.balance_before_minor,'balance_after',t.balance_after_minor,'created_at',t.created_at,'trade_date_utc',(t.created_at at time zone 'UTC')::date,'idempotency_key',t.idempotency_key) order by t.created_at desc) from public.market_transactions t join public.market_players mp on mp.id=t.player_id where t.portfolio_id=p.id),'[]'::jsonb),
    'watchlist', coalesce((select jsonb_agg(mp.app_player_id) from public.market_watchlist w join public.market_players mp on mp.id=w.player_id where w.user_id=uid),'[]'::jsonb)
  );
end; $$;

revoke all on function public.market_buy_player(text,text) from public,anon;
revoke all on function public.market_sell_player(text,text) from public,anon;
revoke all on function public.market_toggle_watchlist(text) from public,anon;
revoke all on function public.market_refresh_my_portfolio() from public,anon;
revoke all on function public.market_app_portfolio_snapshot() from public,anon;
grant execute on function public.market_buy_player(text,text) to authenticated;
grant execute on function public.market_sell_player(text,text) to authenticated;
grant execute on function public.market_toggle_watchlist(text) to authenticated;
grant execute on function public.market_refresh_my_portfolio() to authenticated;
grant execute on function public.market_app_portfolio_snapshot() to authenticated;

commit;
