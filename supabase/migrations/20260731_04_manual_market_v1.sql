-- Simplified manually managed Player Market V1. Additive and reversible.
-- Historical provider/statistics columns and tables are retained but deprecated.
alter table public.market_players add column if not exists internal_player_id text;
alter table public.market_players alter column provider_player_id drop not null;
alter table public.market_players alter column position_group drop not null;
create unique index if not exists market_players_internal_player_id_unique on public.market_players (internal_player_id) where internal_player_id is not null;
alter table public.market_players drop constraint if exists market_players_manual_internal_id_check;
alter table public.market_players add constraint market_players_manual_internal_id_check check (internal_player_id is null or internal_player_id ~ '^fiq_player_[a-z0-9][a-z0-9_-]{2,63}$');
alter table public.market_players drop constraint if exists market_players_manual_availability_check;
alter table public.market_players add constraint market_players_manual_availability_check check (availability_status in ('available', 'sell_only', 'inactive')) not valid;

create table if not exists public.market_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.market_admins enable row level security;
revoke all on table public.market_admins from public, anon, authenticated;
grant select, insert, delete on table public.market_admins to service_role;

create table if not exists public.market_manual_value_requests (
  request_id text primary key,
  player_id uuid not null references public.market_players(id),
  admin_user_id uuid not null references public.market_admins(user_id),
  expected_value_minor int not null,
  new_value_minor int not null,
  effective_at timestamptz not null,
  private_justification text not null,
  event_type text not null check (event_type in ('manual_adjustment', 'correction')),
  valuation_event_id uuid references public.market_valuation_events(id),
  created_at timestamptz not null default now(),
  check (length(btrim(private_justification)) between 10 and 1000)
);
alter table public.market_manual_value_requests enable row level security;
revoke all on table public.market_manual_value_requests from public, anon, authenticated;
grant select, insert on table public.market_manual_value_requests to service_role;

create or replace function public.market_admin_update_player_value(
  p_internal_player_id text, p_expected_current_value_minor int, p_new_value_minor int,
  p_effective_at timestamptz, p_private_justification text, p_request_id text,
  p_event_type text, p_admin_user_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  player_row public.market_players;
  existing_row public.market_manual_value_requests;
  event_row public.market_valuation_events;
  settings_row public.market_settings;
  portfolio_id uuid;
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
  for portfolio_id in select distinct portfolio_id from public.market_holdings where player_id = player_row.id loop perform public.market_recalculate_portfolio_totals(portfolio_id); end loop;
  update public.market_public_leaderboard board set cash_balance_minor = portfolio.cash_balance_minor, holdings_value_minor = portfolio.current_holdings_value_minor, total_wealth_minor = portfolio.total_portfolio_value_minor, realised_profit_minor = portfolio.realised_profit_minor, unrealised_profit_minor = portfolio.unrealised_profit_minor, total_profit_minor = portfolio.realised_profit_minor + portfolio.unrealised_profit_minor, return_basis_points = case when portfolio.starting_balance_minor = 0 then 0 else round(((portfolio.total_portfolio_value_minor - portfolio.starting_balance_minor)::numeric / portfolio.starting_balance_minor::numeric) * 10000)::int end, calculated_at = now() from public.market_portfolios portfolio where board.portfolio_id = portfolio.id and exists (select 1 from public.market_holdings holding where holding.portfolio_id = portfolio.id and holding.player_id = player_row.id);
  return jsonb_build_object('ok', true, 'eventId', event_row.id, 'playerId', player_row.id, 'previousValueMinor', player_row.current_price_minor, 'newValueMinor', p_new_value_minor, 'effectiveAt', p_effective_at, 'idempotent', false);
end; $$;
revoke all on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) to service_role;
