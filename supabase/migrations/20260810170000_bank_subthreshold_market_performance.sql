begin;

-- Preserve sub-threshold rating signals between completed fixtures. A full
-- 0.22 rating-point signal moves the game price by one 0.1m FIQ step; any
-- remainder stays on the player and is combined with later verified evidence.
create or replace function public.market_apply_verified_gameweek(
  p_gameweek_key text,
  p_week_label text,
  p_week_number integer,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_updates jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare
  g public.market_gameweeks; item jsonb; mp public.market_players; stat_id uuid;
  old_price integer; new_price integer; movement integer; week_movement integer;
  baseline numeric; rolling_rating numeric; rating_delta integer; appearances_used integer;
  bounded_signal integer; bank_before integer; bank_after integer; available_steps integer; applied_steps integer;
  processed integer:=0; skipped integer:=0; fixture_ids text[]:='{}';
begin
  if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'INVALID_UPDATES'; end if;
  if length(btrim(coalesce(p_gameweek_key,'')))=0 or p_week_number<1 or p_closes_at<=p_opens_at then raise exception 'INVALID_GAMEWEEK'; end if;
  perform pg_advisory_xact_lock(hashtextextended('market-gameweek:'||p_gameweek_key,0));

  insert into public.market_gameweeks(gameweek_key,week_number,label,state,opens_at,closes_at,gameweek_type)
  values(p_gameweek_key,p_week_number,p_week_label,'processing',p_opens_at,p_closes_at,'results')
  on conflict(gameweek_key) do update set state='processing',error_message=null,updated_at=now(),gameweek_type='results'
  returning * into g;

  create temporary table if not exists pg_temp.fiq_portfolio_before(
    portfolio_id uuid primary key,total_minor integer
  ) on commit drop;
  truncate pg_temp.fiq_portfolio_before;
  insert into pg_temp.fiq_portfolio_before(portfolio_id,total_minor)
  select p.id,coalesce(r.previous_portfolio_value_minor,p.total_portfolio_value_minor)
  from public.market_portfolios p
  left join public.market_gameweek_reveals r on r.portfolio_id=p.id and r.gameweek_id=g.id;

  for item in select value from jsonb_array_elements(p_updates) loop
    mp:=null; stat_id:=null;
    if length(btrim(coalesce(item->>'provider_player_id','')))=0
      or length(btrim(coalesce(item->>'provider_fixture_id','')))=0
      or coalesce(item->>'fixture_date','') !~ '^20[0-9]{2}-' then
      skipped:=skipped+1; continue;
    end if;
    if coalesce(item->>'rating','') !~ '^[0-9]+([.][0-9]+)?$'
      or coalesce(item->>'minutes_played','') !~ '^[0-9]+$' then
      skipped:=skipped+1; continue;
    end if;
    if (item->>'rating')::numeric not between 0 and 10
      or (item->>'minutes_played')::integer not between 1 and 130 then
      skipped:=skipped+1; continue;
    end if;

    select player.* into mp from public.market_players player
    where player.provider_player_id=item->>'provider_player_id' and player.is_available
    order by player.updated_at desc limit 1 for update;
    if mp.id is null then skipped:=skipped+1; continue; end if;

    insert into public.market_player_match_stats(
      player_id,provider_fixture_id,fixture_date,started,minutes_played,provider_rating_milli,
      raw_provider_payload,provider_updated_at,gameweek_id
    ) values(
      mp.id,item->>'provider_fixture_id',(item->>'fixture_date')::timestamptz,
      coalesce((item->>'started')::boolean,false),(item->>'minutes_played')::integer,
      round((item->>'rating')::numeric*1000)::integer,item,
      coalesce((item->>'retrieved_at')::timestamptz,now()),g.id
    ) on conflict(provider_fixture_id,player_id) do nothing returning id into stat_id;
    if stat_id is null then skipped:=skipped+1; continue; end if;

    baseline:=case mp.position_group when 'GK' then 6.75 when 'DEF' then 6.70 when 'MID' then 6.80 else 6.85 end;
    with ranked as (
      select s.provider_rating_milli/1000.0 rating,s.minutes_played,
        row_number() over(order by s.fixture_date desc,s.imported_at desc) rn
      from public.market_player_match_stats s
      where s.player_id=mp.id and s.minutes_played>0 and s.provider_rating_milli is not null
      order by s.fixture_date desc,s.imported_at desc limit 5
    ), weighted as (
      select rating,
        (case rn when 1 then 1.0 when 2 then 0.82 when 3 then 0.67 when 4 then 0.55 else 0.45 end)
        * greatest(0.25,least(1.0,minutes_played/90.0)) weight
      from ranked
    ) select sum(rating*weight)/nullif(sum(weight),0),count(*) into rolling_rating,appearances_used from weighted;

    select coalesce(sum(v.price_change_minor),0) into week_movement
    from public.market_valuation_events v
    join public.market_player_match_stats s on s.id=v.match_stat_id
    where v.player_id=mp.id and s.gameweek_id=g.id;

    rating_delta:=round((rolling_rating-baseline)*1000)::integer;
    bounded_signal:=greatest(-660,least(660,rating_delta));
    bank_before:=mp.performance_bank_milli+bounded_signal;
    available_steps:=trunc(bank_before/220.0)::integer;
    movement:=greatest(-300000,least(300000,available_steps*100000));
    movement:=case when movement>0 then least(movement,greatest(0,600000-greatest(0,week_movement)))
      else greatest(movement,-greatest(0,600000-greatest(0,-week_movement))) end;
    old_price:=mp.current_price_minor;
    new_price:=greatest(4000000,least(15000000,old_price+movement));
    movement:=new_price-old_price;
    applied_steps:=trunc(movement/100000.0)::integer;
    bank_after:=bank_before-(applied_steps*220);

    insert into public.market_valuation_events(
      player_id,match_stat_id,event_type,previous_price_minor,new_price_minor,previous_bank_milli,
      rating_milli,baseline_rating_milli,rating_delta_milli,bank_after_event_milli,price_change_minor,
      reason,calculation_version,effective_at,idempotency_key
    ) values(
      mp.id,stat_id,'verified_rating',old_price,new_price,mp.performance_bank_milli,
      round(rolling_rating*1000)::integer,round(baseline*1000)::integer,rating_delta,
      bank_after,movement,
      'Verified Sportmonks rating; rolling form from '||appearances_used||' appearance(s); residual signal carried forward',
      'fiq-real-performance-v2.1.0',(item->>'fixture_date')::timestamptz,
      'sportmonks:'||(item->>'provider_fixture_id')||':'||(item->>'provider_player_id')
    );
    update public.market_players set current_price_minor=new_price,performance_bank_milli=bank_after,
      latest_rating_milli=round((item->>'rating')::numeric*1000),data_updated_at=now(),updated_at=now()
    where id=mp.id;
    update public.market_player_match_stats set valuation_processed_at=now() where id=stat_id;
    fixture_ids:=array_append(fixture_ids,item->>'provider_fixture_id');
    processed:=processed+1;
  end loop;

  if processed=0 then
    update public.market_gameweeks set state='revealed',processed_at=coalesce(processed_at,now()),updated_at=now() where id=g.id;
    return jsonb_build_object('ok',true,'unchanged',true,'gameweek_id',g.id,'processed_players',0,
      'skipped_players',skipped,'fixture_count',0);
  end if;

  update public.market_holdings h set current_value_minor=player.current_price_minor,
    unrealised_profit_minor=player.current_price_minor-h.purchase_price_minor,updated_at=now()
  from public.market_players player where player.id=h.player_id;

  with totals as (
    select p.id,coalesce(sum(h.current_value_minor),0)::integer holdings_total,
      coalesce(sum(h.unrealised_profit_minor),0)::integer unrealised_total
    from public.market_portfolios p left join public.market_holdings h on h.portfolio_id=p.id group by p.id
  ) update public.market_portfolios p set current_holdings_value_minor=t.holdings_total,
    total_portfolio_value_minor=p.cash_balance_minor+t.holdings_total,
    unrealised_profit_minor=t.unrealised_total,updated_at=now()
  from totals t where t.id=p.id;

  insert into public.market_gameweek_reveals(
    portfolio_id,gameweek_id,previous_portfolio_value_minor,new_portfolio_value_minor,cash_after_minor,
    invested_after_minor,weekly_change_minor,holding_movements
  )
  select p.id,g.id,b.total_minor,p.total_portfolio_value_minor,p.cash_balance_minor,p.current_holdings_value_minor,
    p.total_portfolio_value_minor-b.total_minor,
    coalesce((select jsonb_agg(jsonb_build_object(
      'player_id',player.app_player_id,'player_name',player.display_name,'position',player.position_group,
      'purchase_price',h.purchase_price_minor,'previous_value',coalesce(first_event.previous_price_minor,player.current_price_minor),
      'current_value',player.current_price_minor,
      'delta',player.current_price_minor-coalesce(first_event.previous_price_minor,player.current_price_minor),
      'return_pct',round(((player.current_price_minor-h.purchase_price_minor)::numeric/nullif(h.purchase_price_minor,0))*100,2),
      'explanation','Verified ratings updated this value using five-match rolling form and banked residual movement.') order by player.display_name)
      from public.market_holdings h join public.market_players player on player.id=h.player_id
      left join lateral (
        select v.previous_price_minor from public.market_valuation_events v
        join public.market_player_match_stats s on s.id=v.match_stat_id
        where v.player_id=player.id and s.gameweek_id=g.id
        order by v.effective_at asc,v.created_at asc limit 1
      ) first_event on true where h.portfolio_id=p.id),'[]'::jsonb)
  from public.market_portfolios p join pg_temp.fiq_portfolio_before b on b.portfolio_id=p.id
  on conflict(portfolio_id,gameweek_id) do update set
    new_portfolio_value_minor=excluded.new_portfolio_value_minor,cash_after_minor=excluded.cash_after_minor,
    invested_after_minor=excluded.invested_after_minor,weekly_change_minor=excluded.weekly_change_minor,
    holding_movements=excluded.holding_movements,created_at=now();

  update public.market_gameweeks set state='revealed',processed_at=now(),
    source_fixture_count=(select count(distinct s.provider_fixture_id) from public.market_player_match_stats s where s.gameweek_id=g.id),
    processed_player_count=(select count(*) from public.market_player_match_stats s where s.gameweek_id=g.id),
    updated_at=now() where id=g.id;
  return jsonb_build_object('ok',true,'unchanged',false,'gameweek_id',g.id,'processed_players',processed,
    'skipped_players',skipped,'fixture_count',cardinality(array(select distinct unnest(fixture_ids))));
exception when others then
  update public.market_gameweeks set state='failed',error_message=sqlerrm,updated_at=now() where id=g.id;
  raise;
end $$;

revoke all on function public.market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb) to service_role;

commit;
