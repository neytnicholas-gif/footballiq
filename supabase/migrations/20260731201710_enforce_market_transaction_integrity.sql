-- Manual Player Market transaction-integrity hardening.

-- Replace the Manual V1 admin updater only to remove the PL/pgSQL ambiguity
-- between its loop variable and market_holdings.portfolio_id.
create or replace function public.market_admin_update_player_value(
  p_internal_player_id text, p_expected_current_value_minor int, p_new_value_minor int,
  p_effective_at timestamptz, p_private_justification text, p_request_id text,
  p_event_type text, p_admin_user_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  player_row public.market_players;
  existing_row public.market_manual_value_requests;
  event_row public.market_valuation_events;
  settings_row public.market_settings;
  affected_portfolio_id uuid;
begin
  if not exists (select 1 from public.market_admins where user_id = p_admin_user_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if length(btrim(coalesce(p_request_id, ''))) < 8 then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if p_event_type not in ('manual_adjustment', 'correction') then raise exception 'INVALID_EVENT_TYPE'; end if;
  if length(btrim(coalesce(p_private_justification, ''))) not between 10 and 1000 then raise exception 'JUSTIFICATION_REQUIRED'; end if;
  select * into existing_row from public.market_manual_value_requests where request_id = p_request_id;
  if found then
    if existing_row.expected_value_minor <> p_expected_current_value_minor or existing_row.new_value_minor <> p_new_value_minor or existing_row.player_id <> (select id from public.market_players where internal_player_id = p_internal_player_id) then raise exception 'IDEMPOTENCY_KEY_CONFLICT'; end if;
    return jsonb_build_object('ok', true, 'eventId', existing_row.valuation_event_id, 'playerId', existing_row.player_id, 'previousValueMinor', existing_row.expected_value_minor, 'newValueMinor', existing_row.new_value_minor, 'effectiveAt', existing_row.effective_at, 'idempotent', true);
  end if;
  select * into settings_row from public.market_settings where id = 1 for share;
  if settings_row.active_catalogue_id is null then raise exception 'ACTIVE_CATALOGUE_REQUIRED'; end if;
  select * into player_row from public.market_players where internal_player_id = p_internal_player_id and catalogue_id = settings_row.active_catalogue_id for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if player_row.current_price_minor <> p_expected_current_value_minor then raise exception 'STALE_VALUE'; end if;
  if p_new_value_minor < settings_row.minimum_price_minor or p_new_value_minor > 200 then raise exception 'VALUE_OUT_OF_BOUNDS'; end if;
  if p_effective_at <= player_row.data_updated_at then raise exception 'NON_CHRONOLOGICAL_VALUE'; end if;
  insert into public.market_manual_value_requests (request_id, player_id, admin_user_id, expected_value_minor, new_value_minor, effective_at, private_justification, event_type) values (p_request_id, player_row.id, p_admin_user_id, p_expected_current_value_minor, p_new_value_minor, p_effective_at, btrim(p_private_justification), p_event_type) returning * into existing_row;
  insert into public.market_valuation_events (player_id, match_stat_id, event_type, previous_price_minor, new_price_minor, previous_bank_milli, rating_milli, baseline_rating_milli, rating_delta_milli, bank_after_event_milli, price_change_minor, reason, calculation_version, effective_at, idempotency_key) values (player_row.id, null, p_event_type, player_row.current_price_minor, p_new_value_minor, 0, null, 0, 0, 0, p_new_value_minor - player_row.current_price_minor, null, 'manual-v1', p_effective_at, p_request_id) returning * into event_row;
  update public.market_manual_value_requests set valuation_event_id = event_row.id where request_id = p_request_id;
  update public.market_players set current_price_minor = p_new_value_minor, data_updated_at = p_effective_at, updated_at = now() where id = player_row.id;
  update public.market_holdings set current_value_minor = p_new_value_minor, unrealised_profit_minor = p_new_value_minor - purchase_price_minor, updated_at = now() where player_id = player_row.id;
  for affected_portfolio_id in
    select distinct holding.portfolio_id
    from public.market_holdings as holding
    where holding.player_id = player_row.id
  loop
    perform public.market_recalculate_portfolio_totals(affected_portfolio_id);
  end loop;
  update public.market_public_leaderboard board set cash_balance_minor = portfolio.cash_balance_minor, holdings_value_minor = portfolio.current_holdings_value_minor, total_wealth_minor = portfolio.total_portfolio_value_minor, realised_profit_minor = portfolio.realised_profit_minor, unrealised_profit_minor = portfolio.unrealised_profit_minor, total_profit_minor = portfolio.realised_profit_minor + portfolio.unrealised_profit_minor, return_basis_points = case when portfolio.starting_balance_minor = 0 then 0 else round(((portfolio.total_portfolio_value_minor - portfolio.starting_balance_minor)::numeric / portfolio.starting_balance_minor::numeric) * 10000)::int end, calculated_at = now() from public.market_portfolios portfolio where board.portfolio_id = portfolio.id and exists (select 1 from public.market_holdings holding where holding.portfolio_id = portfolio.id and holding.player_id = player_row.id);
  return jsonb_build_object('ok', true, 'eventId', event_row.id, 'playerId', player_row.id, 'previousValueMinor', player_row.current_price_minor, 'newValueMinor', p_new_value_minor, 'effectiveAt', p_effective_at, 'idempotent', false);
end;
$$;
revoke all on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) to service_role;

-- Valuation history is append-only. Corrections are new events, never edits.
create or replace function public.market_reject_valuation_event_mutation()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  raise exception 'VALUATION_EVENTS_ARE_IMMUTABLE';
end;
$$;
revoke all on function public.market_reject_valuation_event_mutation() from public, anon, authenticated, service_role;

drop trigger if exists trg_market_valuation_events_immutable on public.market_valuation_events;
create trigger trg_market_valuation_events_immutable
before update or delete on public.market_valuation_events
for each row execute function public.market_reject_valuation_event_mutation();

revoke update, delete on table public.market_valuation_events from public, anon, authenticated, service_role;
