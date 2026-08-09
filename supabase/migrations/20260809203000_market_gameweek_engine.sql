begin;

create table if not exists public.market_gameweeks (
  id uuid primary key default gen_random_uuid(),
  gameweek_key text not null unique,
  week_number integer not null check (week_number > 0),
  label text not null check (length(btrim(label)) > 0),
  state text not null default 'open' check (state in ('open','processing','revealed','closed','failed')),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  processed_at timestamptz,
  source_fixture_count integer not null default 0 check (source_fixture_count >= 0),
  processed_player_count integer not null default 0 check (processed_player_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create index if not exists market_gameweeks_state_dates_idx
  on public.market_gameweeks(state, opens_at desc, closes_at desc);

create table if not exists public.market_gameweek_allowances (
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  gameweek_id uuid not null references public.market_gameweeks(id) on delete cascade,
  signings_used integer not null default 0 check (signings_used between 0 and 11),
  sales_count integer not null default 0 check (sales_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (portfolio_id, gameweek_id)
);

create index if not exists market_gameweek_allowances_gameweek_idx
  on public.market_gameweek_allowances(gameweek_id, portfolio_id);

create table if not exists public.market_gameweek_reveals (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.market_portfolios(id) on delete cascade,
  gameweek_id uuid not null references public.market_gameweeks(id) on delete cascade,
  previous_portfolio_value_minor integer not null,
  new_portfolio_value_minor integer not null,
  cash_after_minor integer not null,
  invested_after_minor integer not null,
  weekly_change_minor integer not null,
  holding_movements jsonb not null default '[]'::jsonb check (jsonb_typeof(holding_movements) = 'array'),
  created_at timestamptz not null default now(),
  unique (portfolio_id, gameweek_id)
);

create index if not exists market_gameweek_reveals_portfolio_created_idx
  on public.market_gameweek_reveals(portfolio_id, created_at desc);

alter table public.market_player_match_stats add column if not exists gameweek_id uuid references public.market_gameweeks(id) on delete restrict;
create unique index if not exists market_player_match_stats_fixture_player_uidx
  on public.market_player_match_stats(provider_fixture_id, player_id);
create index if not exists market_player_match_stats_gameweek_idx
  on public.market_player_match_stats(gameweek_id, valuation_processed_at);

alter table public.market_gameweeks enable row level security;
alter table public.market_gameweek_allowances enable row level security;
alter table public.market_gameweek_reveals enable row level security;

revoke all on table public.market_gameweeks from public, anon, authenticated;
revoke all on table public.market_gameweek_allowances from public, anon, authenticated;
revoke all on table public.market_gameweek_reveals from public, anon, authenticated;
grant select on table public.market_gameweeks to anon, authenticated;
grant select on table public.market_gameweek_allowances to authenticated;
grant select on table public.market_gameweek_reveals to authenticated;
grant all on table public.market_gameweeks to service_role;
grant all on table public.market_gameweek_allowances to service_role;
grant all on table public.market_gameweek_reveals to service_role;

drop policy if exists market_gameweeks_public_read on public.market_gameweeks;
create policy market_gameweeks_public_read on public.market_gameweeks for select to anon, authenticated using (true);
drop policy if exists market_gameweek_allowances_owner_read on public.market_gameweek_allowances;
create policy market_gameweek_allowances_owner_read on public.market_gameweek_allowances for select to authenticated
using (exists (select 1 from public.market_portfolios p where p.id=portfolio_id and p.user_id=(select auth.uid())));
drop policy if exists market_gameweek_reveals_owner_read on public.market_gameweek_reveals;
create policy market_gameweek_reveals_owner_read on public.market_gameweek_reveals for select to authenticated
using (exists (select 1 from public.market_portfolios p where p.id=portfolio_id and p.user_id=(select auth.uid())));

create or replace function public.market_current_gameweek()
returns public.market_gameweeks language sql stable security invoker set search_path=pg_catalog,public
as $$
  select g.* from public.market_gameweeks g
  where now() >= g.opens_at and now() < g.closes_at and g.state in ('open','revealed')
  order by g.opens_at desc limit 1
$$;

create or replace function public.market_ensure_current_gameweek()
returns public.market_gameweeks language plpgsql security definer set search_path=pg_catalog,public
as $$
declare g public.market_gameweeks; monday date; next_monday date; week_no integer;
begin
  select * into g from public.market_current_gameweek();
  if g.id is not null then return g; end if;
  perform pg_advisory_xact_lock(hashtextextended('market-current-gameweek',0));
  select * into g from public.market_current_gameweek();
  if g.id is not null then return g; end if;
  monday := ((now() at time zone 'Europe/Brussels')::date - ((extract(isodow from now() at time zone 'Europe/Brussels')::integer)-1));
  next_monday := monday + 7;
  select coalesce(max(week_number),0)+1 into week_no from public.market_gameweeks;
  insert into public.market_gameweeks(gameweek_key,week_number,label,state,opens_at,closes_at)
  values ('fiq-'||to_char(monday,'IYYY-IW'),week_no,'Gameweek '||week_no,'open',monday::timestamp at time zone 'Europe/Brussels',next_monday::timestamp at time zone 'Europe/Brussels')
  on conflict (gameweek_key) do update set updated_at=now()
  returning * into g;
  return g;
end $$;

create or replace function public.market_my_gameweek_status()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); g public.market_gameweeks; p public.market_portfolios; a public.market_gameweek_allowances;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into g from public.market_ensure_current_gameweek();
  select * into p from public.market_portfolios where user_id=uid order by created_at desc limit 1;
  if p.id is not null then
    insert into public.market_gameweek_allowances(portfolio_id,gameweek_id) values(p.id,g.id) on conflict do nothing;
    select * into a from public.market_gameweek_allowances where portfolio_id=p.id and gameweek_id=g.id;
  end if;
  return jsonb_build_object('gameweek_id',g.id,'gameweek_key',g.gameweek_key,'week_number',g.week_number,'label',g.label,
    'state',g.state,'opens_at',g.opens_at,'closes_at',g.closes_at,'signings_used',coalesce(a.signings_used,0),
    'signings_remaining',11-coalesce(a.signings_used,0),'sales_count',coalesce(a.sales_count,0),'maximum_signings',11);
end $$;

create or replace function public.market_buy_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  tx public.market_transactions; position_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select mp.* into player from public.market_players mp
    join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) and mp.is_available
    order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into tx from public.market_transactions t join public.market_portfolios x on x.id=t.portfolio_id
    where t.idempotency_key=p_idempotency_key and x.user_id=uid;
  if found then return jsonb_build_object('ok',true,'message','Buy already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then p:=public.market_create_or_get_portfolio(); end if;
  if exists(select 1 from public.market_holdings where portfolio_id=p.id and player_id=player.id) then raise exception 'ALREADY_OWNED'; end if;
  if (select count(*) from public.market_holdings where portfolio_id=p.id)>=s.maximum_holdings then raise exception 'MAX_HOLDINGS'; end if;
  select count(*) into position_count from public.market_holdings h join public.market_players mp on mp.id=h.player_id
    where h.portfolio_id=p.id and mp.position_group=player.position_group;
  if (player.position_group='GK' and position_count>=1) or (player.position_group='DEF' and position_count>=4)
    or (player.position_group='MID' and position_count>=3) or (player.position_group='FWD' and position_count>=3) then raise exception 'FORMATION_LIMIT'; end if;
  if p.cash_balance_minor<player.current_price_minor then raise exception 'INSUFFICIENT_BALANCE'; end if;
  perform public.market_record_gameweek_trade(p.id,'buy');
  insert into public.market_holdings(portfolio_id,player_id,quantity,purchase_price_minor,current_value_minor,unrealised_profit_minor)
    values(p.id,player.id,1,player.current_price_minor,player.current_price_minor,0);
  update public.market_portfolios set cash_balance_minor=cash_balance_minor-player.current_price_minor where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'buy',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor-player.current_price_minor,0,player.current_price_minor,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); s public.market_settings; p public.market_portfolios; player public.market_players;
  holding public.market_holdings; tx public.market_transactions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))=0 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into s from public.market_settings where id=1 for share;
  select * into p from public.market_portfolios where user_id=uid and season_id=s.active_season_id for update;
  if not found then raise exception 'PORTFOLIO_NOT_FOUND'; end if;
  select mp.* into player from public.market_players mp join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
    where (mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug) order by (mp.app_player_id::text=p_player_slug) desc,mp.updated_at desc limit 1 for update of mp;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into tx from public.market_transactions t where t.idempotency_key=p_idempotency_key and t.portfolio_id=p.id;
  if found then return jsonb_build_object('ok',true,'message','Sale already executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor); end if;
  select * into holding from public.market_holdings where portfolio_id=p.id and player_id=player.id for update;
  if not found then raise exception 'NOT_OWNED'; end if;
  perform public.market_record_gameweek_trade(p.id,'sell');
  delete from public.market_holdings where id=holding.id;
  update public.market_portfolios set cash_balance_minor=cash_balance_minor+player.current_price_minor,
    realised_profit_minor=realised_profit_minor+(player.current_price_minor-holding.purchase_price_minor) where id=p.id;
  insert into public.market_transactions(portfolio_id,player_id,transaction_type,executed_price_minor,balance_before_minor,balance_after_minor,
    holding_value_before_minor,holding_value_after_minor,idempotency_key)
  values(p.id,player.id,'sell',player.current_price_minor,p.cash_balance_minor,p.cash_balance_minor+player.current_price_minor,holding.current_value_minor,0,p_idempotency_key)
  returning * into tx;
  perform public.market_recalculate_portfolio_totals(p.id);
  return jsonb_build_object('ok',true,'message','Sale executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_record_gameweek_trade(p_portfolio_id uuid,p_transaction_type text)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare g public.market_gameweeks; a public.market_gameweek_allowances;
begin
  select * into g from public.market_ensure_current_gameweek();
  if g.state not in ('open','revealed') then raise exception 'GAMEWEEK_LOCKED'; end if;
  insert into public.market_gameweek_allowances(portfolio_id,gameweek_id) values(p_portfolio_id,g.id) on conflict do nothing;
  select * into a from public.market_gameweek_allowances where portfolio_id=p_portfolio_id and gameweek_id=g.id for update;
  if p_transaction_type='buy' then
    if a.signings_used>=11 then raise exception 'GAMEWEEK_TRANSFER_LIMIT'; end if;
    update public.market_gameweek_allowances set signings_used=signings_used+1,updated_at=now() where portfolio_id=p_portfolio_id and gameweek_id=g.id;
  elsif p_transaction_type='sell' then
    update public.market_gameweek_allowances set sales_count=sales_count+1,updated_at=now() where portfolio_id=p_portfolio_id and gameweek_id=g.id;
  else raise exception 'INVALID_TRANSACTION_TYPE'; end if;
end $$;

create or replace function public.market_apply_verified_gameweek(
  p_gameweek_key text,
  p_week_label text,
  p_week_number integer,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_updates jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare g public.market_gameweeks; item jsonb; mp public.market_players; stat_id uuid; old_price integer; new_price integer;
  processed integer:=0; skipped integer:=0; fixture_ids text[]:='{}'; pf record;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'INVALID_UPDATES'; end if;
  perform pg_advisory_xact_lock(hashtextextended('market-gameweek:'||p_gameweek_key,0));
  insert into public.market_gameweeks(gameweek_key,week_number,label,state,opens_at,closes_at)
  values(p_gameweek_key,p_week_number,p_week_label,'processing',p_opens_at,p_closes_at)
  on conflict(gameweek_key) do update set state='processing',error_message=null,updated_at=now()
  returning * into g;

  create temporary table if not exists pg_temp.fiq_portfolio_before(portfolio_id uuid primary key,total_minor integer) on commit drop;
  truncate pg_temp.fiq_portfolio_before;
  insert into pg_temp.fiq_portfolio_before select id,total_portfolio_value_minor from public.market_portfolios;

  for item in select value from jsonb_array_elements(p_updates) loop
    select * into mp from public.market_players
      where provider_player_id=item->>'provider_player_id' and is_available
      order by updated_at desc limit 1 for update;
    if mp.id is null then skipped:=skipped+1; continue; end if;
    insert into public.market_player_match_stats(player_id,provider_fixture_id,fixture_date,started,minutes_played,provider_rating_milli,raw_provider_payload,provider_updated_at,gameweek_id)
    values(mp.id,item->>'provider_fixture_id',(item->>'fixture_date')::timestamptz,coalesce((item->>'started')::boolean,false),
      (item->>'minutes_played')::integer,round((item->>'rating')::numeric*1000)::integer,item,coalesce((item->>'retrieved_at')::timestamptz,now()),g.id)
    on conflict(provider_fixture_id,player_id) do nothing returning id into stat_id;
    if stat_id is null then skipped:=skipped+1; continue; end if;
    old_price:=mp.current_price_minor;
    new_price:=greatest(4000000,least(15000000,old_price+greatest(-300000,least(300000,round((((item->>'rating')::numeric-
      case mp.position_group when 'GK' then 6.75 when 'DEF' then 6.70 when 'MID' then 6.80 else 6.85 end)/0.22))*100000))));
    insert into public.market_valuation_events(player_id,match_stat_id,event_type,previous_price_minor,new_price_minor,previous_bank_milli,
      rating_milli,baseline_rating_milli,rating_delta_milli,bank_after_event_milli,price_change_minor,reason,calculation_version,effective_at,idempotency_key)
    values(mp.id,stat_id,'verified_rating',old_price,new_price,mp.performance_bank_milli,round((item->>'rating')::numeric*1000),
      round((case mp.position_group when 'GK' then 6.75 when 'DEF' then 6.70 when 'MID' then 6.80 else 6.85 end)*1000),0,mp.performance_bank_milli,
      new_price-old_price,'Verified Sportmonks rating and minutes','fiq-real-performance-v2.0.0',(item->>'fixture_date')::timestamptz,
      'sportmonks:'||(item->>'provider_fixture_id')||':'||(item->>'provider_player_id')) on conflict(idempotency_key) do nothing;
    update public.market_players set current_price_minor=new_price,latest_rating_milli=round((item->>'rating')::numeric*1000),data_updated_at=now(),updated_at=now() where id=mp.id;
    update public.market_player_match_stats set valuation_processed_at=now() where id=stat_id;
    fixture_ids:=array_append(fixture_ids,item->>'provider_fixture_id'); processed:=processed+1;
  end loop;

  update public.market_holdings h set current_value_minor=held_player.current_price_minor,
    unrealised_profit_minor=held_player.current_price_minor-h.purchase_price_minor,updated_at=now()
    from public.market_players held_player where held_player.id=h.player_id;
  for pf in select id from public.market_portfolios loop perform public.market_recalculate_portfolio_totals(pf.id); end loop;

  insert into public.market_gameweek_reveals(portfolio_id,gameweek_id,previous_portfolio_value_minor,new_portfolio_value_minor,cash_after_minor,invested_after_minor,weekly_change_minor,holding_movements)
  select p.id,g.id,b.total_minor,p.total_portfolio_value_minor,p.cash_balance_minor,p.current_holdings_value_minor,
    p.total_portfolio_value_minor-b.total_minor,
    coalesce((select jsonb_agg(jsonb_build_object('player_id',held_player.app_player_id,'player_name',held_player.display_name,'position',held_player.position_group,
      'purchase_price',h.purchase_price_minor,'previous_value',ve.previous_price_minor,'current_value',held_player.current_price_minor,
      'delta',held_player.current_price_minor-coalesce(ve.previous_price_minor,held_player.current_price_minor),
      'return_pct',round(((held_player.current_price_minor-h.purchase_price_minor)::numeric/nullif(h.purchase_price_minor,0))*100,2),
      'explanation','Verified match rating updated this player value.') order by held_player.display_name)
      from public.market_holdings h join public.market_players held_player on held_player.id=h.player_id
      left join lateral (select v.previous_price_minor from public.market_valuation_events v where v.player_id=held_player.id and v.effective_at>=g.opens_at order by v.effective_at desc limit 1) ve on true
      where h.portfolio_id=p.id),'[]'::jsonb)
  from public.market_portfolios p join pg_temp.fiq_portfolio_before b on b.portfolio_id=p.id
  on conflict(portfolio_id,gameweek_id) do update set new_portfolio_value_minor=excluded.new_portfolio_value_minor,
    cash_after_minor=excluded.cash_after_minor,invested_after_minor=excluded.invested_after_minor,
    weekly_change_minor=excluded.weekly_change_minor,holding_movements=excluded.holding_movements,created_at=now();

  update public.market_gameweeks set state='revealed',processed_at=now(),source_fixture_count=cardinality(array(select distinct unnest(fixture_ids))),
    processed_player_count=processed,updated_at=now() where id=g.id;
  return jsonb_build_object('ok',true,'gameweek_id',g.id,'processed_players',processed,'skipped_players',skipped,
    'fixture_count',cardinality(array(select distinct unnest(fixture_ids))));
exception when others then
  update public.market_gameweeks set state='failed',error_message=sqlerrm,updated_at=now() where id=g.id;
  raise;
end $$;

create or replace function public.market_my_reveals(p_limit integer default 12)
returns jsonb language sql stable security definer set search_path=pg_catalog,public
as $$
select coalesce(jsonb_agg(jsonb_build_object('scope_key',p.user_id::text,'week_number',g.week_number,'week_label',g.label,
  'completed_at',r.created_at,'previous_portfolio_value',r.previous_portfolio_value_minor,'new_portfolio_value',r.new_portfolio_value_minor,
  'weekly_change',r.weekly_change_minor,'weekly_return_pct',round((r.weekly_change_minor::numeric/nullif(r.previous_portfolio_value_minor,0))*100,2),
  'cash_after',r.cash_after_minor,'invested_after',r.invested_after_minor,'total_after',r.new_portfolio_value_minor,
  'biggest_winner',jsonb_build_object('player_id',null,'player_name',null,'delta',0),
  'biggest_loser',jsonb_build_object('player_id',null,'player_name',null,'delta',0),
  'best_held_player',jsonb_build_object('player_id',null,'player_name',null,'delta',0),
  'weakest_held_player',jsonb_build_object('player_id',null,'player_name',null,'delta',0),'holdings',r.holding_movements)
  order by r.created_at desc),'[]'::jsonb)
from (select * from public.market_gameweek_reveals order by created_at desc limit greatest(1,least(p_limit,52))) r
join public.market_portfolios p on p.id=r.portfolio_id join public.market_gameweeks g on g.id=r.gameweek_id
where p.user_id=(select auth.uid())
$$;

revoke all on function public.market_current_gameweek() from public;
revoke all on function public.market_ensure_current_gameweek() from public,anon,authenticated;
revoke all on function public.market_record_gameweek_trade(uuid,text) from public,anon,authenticated;
revoke all on function public.market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.market_my_gameweek_status() from public,anon;
revoke all on function public.market_my_reveals(integer) from public,anon;
grant execute on function public.market_current_gameweek() to anon,authenticated,service_role;
grant execute on function public.market_ensure_current_gameweek() to service_role;
grant execute on function public.market_record_gameweek_trade(uuid,text) to service_role;
grant execute on function public.market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb) to service_role;
grant execute on function public.market_my_gameweek_status() to authenticated;
grant execute on function public.market_my_reveals(integer) to authenticated;
revoke all on function public.market_buy_player(text,text) from public,anon;
revoke all on function public.market_sell_player(text,text) from public,anon;
grant execute on function public.market_buy_player(text,text) to authenticated;
grant execute on function public.market_sell_player(text,text) to authenticated;

commit;
