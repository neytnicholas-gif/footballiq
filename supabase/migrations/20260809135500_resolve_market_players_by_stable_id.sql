-- Provider display-name encoding can change a derived slug. Account actions use
-- the stable numeric provider/app id while retaining slug compatibility.
create or replace function public.market_buy_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare player public.market_players; tx public.market_transactions; position_count integer; p public.market_portfolios; s public.market_settings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp
  join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug or mp.provider_player_id=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into s from public.market_settings where id=1;
  select * into p from public.market_portfolios where user_id=auth.uid() and season_id=s.active_season_id;
  if p.id is not null then
    select count(*) into position_count from public.market_holdings h join public.market_players mp on mp.id=h.player_id where h.portfolio_id=p.id and mp.position_group=player.position_group;
    if (player.position_group='GK' and position_count>=1) or (player.position_group='DEF' and position_count>=4) or (player.position_group='MID' and position_count>=3) or (player.position_group='FWD' and position_count>=3) then raise exception 'FORMATION_LIMIT'; end if;
  end if;
  tx:=public.market_buy_player(player.id,p_idempotency_key,player.current_price_minor);
  return jsonb_build_object('ok',true,'message','Buy executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_sell_player(p_player_slug text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare player public.market_players; tx public.market_transactions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp
  join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug or mp.provider_player_id=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  tx:=public.market_sell_player(player.id,p_idempotency_key);
  return jsonb_build_object('ok',true,'message','Sell executed','transaction_id',tx.id,'player_slug',player.slug,'execution_value',tx.executed_price_minor);
end $$;

create or replace function public.market_toggle_watchlist(p_player_slug text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$ declare uid uuid:=auth.uid(); player public.market_players;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select mp.* into player from public.market_players mp
  join public.market_active_catalogues ac on ac.catalogue_id=mp.catalogue_id and ac.season_id=mp.season_id
  where mp.slug=p_player_slug or mp.app_player_id::text=p_player_slug or mp.provider_player_id=p_player_slug;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if exists(select 1 from public.market_watchlist where user_id=uid and player_id=player.id) then
    delete from public.market_watchlist where user_id=uid and player_id=player.id;
    return jsonb_build_object('watchlisted',false);
  end if;
  insert into public.market_watchlist(user_id,player_id) values(uid,player.id);
  return jsonb_build_object('watchlisted',true);
end $$;

revoke all on function public.market_buy_player(text,text) from public,anon;
revoke all on function public.market_sell_player(text,text) from public,anon;
revoke all on function public.market_toggle_watchlist(text) from public,anon;
grant execute on function public.market_buy_player(text,text) to authenticated;
grant execute on function public.market_sell_player(text,text) to authenticated;
grant execute on function public.market_toggle_watchlist(text) to authenticated;
