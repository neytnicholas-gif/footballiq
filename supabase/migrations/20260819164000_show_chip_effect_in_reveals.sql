begin;

-- Reveal cards separate the public market move from the manager's private
-- chip effect so the result of the weekly decision is immediately clear.
create or replace function public.market_enrich_gameweek_reveal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id', movement.app_player_id,
    'player_name', movement.display_name,
    'position', movement.position_group,
    'purchase_price', movement.purchase_price_minor,
    'previous_value', movement.current_value_minor - movement.base_movement - movement.chip_adjustment,
    'current_value', movement.current_value_minor,
    'delta', movement.base_movement + movement.chip_adjustment,
    'market_delta', movement.base_movement,
    'chip_adjustment', movement.chip_adjustment,
    'chip_key', movement.chip_key,
    'return_pct', round(((movement.current_value_minor - movement.purchase_price_minor)::numeric
      / nullif(movement.purchase_price_minor, 0)) * 100, 2),
    'explanation', case when movement.chip_key is not null
      then 'Verified ratings moved the public price, then your weekly chip changed only this held copy.'
      else 'Verified ratings updated this value using five-match rolling form and banked residual movement.' end
  ) order by movement.display_name), '[]'::jsonb)
  into new.holding_movements
  from (
    select holding.id, holding.purchase_price_minor, holding.current_value_minor,
      player.app_player_id, player.display_name, player.position_group,
      coalesce((
        select sum(event.price_change_minor)::integer
        from public.market_valuation_events event
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where event.player_id = player.id and stat.gameweek_id = new.gameweek_id
          and event.created_at >= holding.purchased_at
      ), 0) as base_movement,
      coalesce((
        select sum(entry.adjustment_minor)::integer
        from public.market_holding_value_adjustments entry
        join public.market_valuation_events event on event.id = entry.valuation_event_id
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where entry.holding_id = holding.id and stat.gameweek_id = new.gameweek_id
      ), 0) as chip_adjustment,
      (
        select play.chip_key
        from public.market_holding_value_adjustments entry
        join public.market_gameweek_chip_plays play on play.id = entry.chip_play_id
        join public.market_valuation_events event on event.id = entry.valuation_event_id
        join public.market_player_match_stats stat on stat.id = event.match_stat_id
        where entry.holding_id = holding.id and stat.gameweek_id = new.gameweek_id
        order by entry.created_at desc limit 1
      ) as chip_key
    from public.market_holdings holding
    join public.market_players player on player.id = holding.player_id
    where holding.portfolio_id = new.portfolio_id
  ) movement;
  return new;
end;
$$;

revoke all on function public.market_enrich_gameweek_reveal()
  from public, anon, authenticated;

comment on function public.market_enrich_gameweek_reveal() is
  'Adds public movement, private chip effect and held-copy value to each future Reveal.';

commit;
