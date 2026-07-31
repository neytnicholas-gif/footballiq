-- Manual Player Market database hardening V1.
-- Additive supersession of legacy migrations 01-04. Validate in a positively
-- identified non-production project before any production consideration.

-- Manual catalogues no longer require provider provenance.
alter table public.market_catalogues alter column source_type drop not null;
alter table public.market_catalogues alter column source_reference drop not null;
alter table public.market_catalogues drop constraint if exists market_catalogues_source_type_check;
alter table public.market_catalogues
  add column if not exists manual_schema_version int,
  add column if not exists validation_error_count int not null default 0,
  add column if not exists unresolved_warning_count int not null default 0,
  add column if not exists approval_fingerprint text,
  add column if not exists declaration_independently_selected boolean not null default false,
  add column if not exists declaration_no_systematic_copy boolean not null default false,
  add column if not exists declaration_original_values boolean not null default false,
  add column if not exists declaration_manually_reviewed boolean not null default false,
  add column if not exists declaration_identities_resolved boolean not null default false;

alter table public.market_catalogues drop constraint if exists market_catalogues_manual_v1_evidence_check;
alter table public.market_catalogues add constraint market_catalogues_manual_v1_evidence_check check (
  status not in ('approved', 'active') or (
    manual_schema_version = 1
    and record_count between 1 and 50
    and validation_error_count = 0
    and unresolved_warning_count = 0
    and approval_fingerprint = fingerprint
    and approved_at is not null
    and length(btrim(approved_by)) > 0
    and approved_at >= validated_at
    and declaration_independently_selected
    and declaration_no_systematic_copy
    and declaration_original_values
    and declaration_manually_reviewed
    and declaration_identities_resolved
  )
) not valid;

-- Availability status is authoritative. Existing holders may sell both
-- sell_only and inactive players at the last authoritative FootballIQ value.
create or replace function public.market_sync_manual_availability()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if new.availability_status not in ('available', 'sell_only', 'inactive') then
    raise exception 'INVALID_AVAILABILITY_STATUS';
  end if;
  new.is_available := new.availability_status = 'available';
  return new;
end;
$$;
drop trigger if exists trg_market_players_sync_manual_availability on public.market_players;
create trigger trg_market_players_sync_manual_availability
before insert or update of availability_status, is_available on public.market_players
for each row execute function public.market_sync_manual_availability();
revoke all on function public.market_sync_manual_availability() from public, anon, authenticated;

-- Provider-independent, exact fingerprint-bound Manual V1 activation.
create or replace function public.market_activate_catalogue(p_catalogue_id uuid, p_fingerprint text)
returns void language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  catalogue_row public.market_catalogues;
  actual_count int;
begin
  select * into catalogue_row from public.market_catalogues where id = p_catalogue_id for update;
  if not found then raise exception 'CATALOGUE_NOT_FOUND'; end if;
  if catalogue_row.status <> 'approved' then raise exception 'CATALOGUE_NOT_APPROVED'; end if;
  if catalogue_row.manual_schema_version <> 1 then raise exception 'UNSUPPORTED_MANUAL_SCHEMA'; end if;
  if catalogue_row.fingerprint <> p_fingerprint or catalogue_row.approval_fingerprint <> p_fingerprint then raise exception 'CATALOGUE_FINGERPRINT_MISMATCH'; end if;
  if catalogue_row.record_count not between 1 and 50 then raise exception 'INVALID_CATALOGUE_SIZE'; end if;
  if catalogue_row.validation_error_count <> 0 or catalogue_row.rejected_count <> 0 then raise exception 'CATALOGUE_HAS_VALIDATION_ERRORS'; end if;
  if catalogue_row.unresolved_warning_count <> 0 then raise exception 'CATALOGUE_HAS_UNRESOLVED_WARNINGS'; end if;
  if catalogue_row.approved_at is null or catalogue_row.approved_at < catalogue_row.validated_at or length(btrim(coalesce(catalogue_row.approved_by, ''))) = 0 then raise exception 'INVALID_OR_STALE_APPROVAL'; end if;
  if not catalogue_row.declaration_independently_selected or not catalogue_row.declaration_no_systematic_copy or not catalogue_row.declaration_original_values or not catalogue_row.declaration_manually_reviewed or not catalogue_row.declaration_identities_resolved then raise exception 'MANUAL_DECLARATION_REQUIRED'; end if;

  select count(*) into actual_count from public.market_players player
  where player.catalogue_id = catalogue_row.id
    and player.season_id = catalogue_row.season_id
    and player.internal_player_id is not null
    and player.internal_player_id ~ '^fiq_player_[a-z0-9][a-z0-9_-]{2,63}$'
    and length(btrim(player.display_name)) > 0
    and player.current_price_minor between 10 and 200
    and player.availability_status in ('available', 'sell_only', 'inactive')
    and player.is_available = (player.availability_status = 'available');
  if actual_count <> catalogue_row.record_count then raise exception 'CATALOGUE_RECORD_COUNT_MISMATCH'; end if;

  update public.market_catalogues set status = 'retired', updated_at = now() where status = 'active' and id <> catalogue_row.id;
  update public.market_seasons set is_active = (id = catalogue_row.season_id);
  update public.market_catalogues set status = 'active', activated_at = now(), updated_at = now() where id = catalogue_row.id;
  update public.market_settings set active_season_id = catalogue_row.season_id, active_catalogue_id = catalogue_row.id, updated_at = now() where id = 1;
end;
$$;
revoke all on function public.market_activate_catalogue(uuid, text) from public, anon, authenticated;
grant execute on function public.market_activate_catalogue(uuid, text) to service_role;

-- Direct legacy rows expose deprecated columns. Public clients receive only
-- minimal projections through tightly scoped SECURITY DEFINER functions.
revoke select on table public.market_players, public.market_valuation_events,
  public.market_clubs, public.market_seasons, public.market_settings,
  public.market_catalogues, public.player_season_stats,
  public.market_public_leaderboard from anon, authenticated;

create or replace function public.market_public_players_v1()
returns table (id uuid, internal_player_id text, display_name text, current_value_minor int, availability_status text, value_updated_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public as $$
  select player.id, player.internal_player_id, player.display_name,
    player.current_price_minor, player.availability_status, player.data_updated_at
  from public.market_players player
  join public.market_catalogues catalogue on catalogue.id = player.catalogue_id
  where catalogue.status = 'active'
    and player.season_id = catalogue.season_id
    and player.availability_status in ('available', 'sell_only');
$$;
revoke all on function public.market_public_players_v1() from public;
grant execute on function public.market_public_players_v1() to anon, authenticated;

create or replace function public.market_public_value_history_v1(p_player_id uuid)
returns table (player_id uuid, value_minor int, effective_at timestamptz, event_type text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select event.player_id, event.new_price_minor, event.effective_at,
    case when event.event_type = 'correction' then 'correction' else 'value_update' end
  from public.market_valuation_events event
  join public.market_players player on player.id = event.player_id
  join public.market_catalogues catalogue on catalogue.id = player.catalogue_id
  where event.player_id = p_player_id and catalogue.status = 'active'
    and player.availability_status in ('available', 'sell_only')
  order by event.effective_at;
$$;
revoke all on function public.market_public_value_history_v1(uuid) from public;
grant execute on function public.market_public_value_history_v1(uuid) to anon, authenticated;

create or replace function public.market_public_leaderboard_v1()
returns table (display_name text, cash_balance_minor bigint, holdings_value_minor bigint, total_wealth_minor bigint, realised_profit_minor bigint, unrealised_profit_minor bigint, total_profit_minor bigint, weekly_change_minor bigint, return_basis_points int, calculated_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public as $$
  select board.display_name, board.cash_balance_minor, board.holdings_value_minor,
    board.total_wealth_minor, board.realised_profit_minor, board.unrealised_profit_minor,
    board.total_profit_minor, board.weekly_change_minor, board.return_basis_points, board.calculated_at
  from public.market_public_leaderboard board
  where exists (select 1 from public.market_catalogues catalogue where catalogue.season_id = board.season_id and catalogue.status = 'active');
$$;
revoke all on function public.market_public_leaderboard_v1() from public;
grant execute on function public.market_public_leaderboard_v1() to anon, authenticated;

-- Club-independent owner snapshot. Inactive holdings remain visible and sellable.
create or replace function public.market_get_portfolio_snapshot()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  current_user_id uuid := auth.uid(); settings_row public.market_settings;
  portfolio_row public.market_portfolios; daily_row public.market_daily_limits; snapshot jsonb;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into settings_row from public.market_settings where id = 1;
  if settings_row.active_catalogue_id is null or settings_row.active_season_id is null then raise exception 'ACTIVE_CATALOGUE_REQUIRED'; end if;
  select * into portfolio_row from public.market_portfolios where user_id = current_user_id and season_id = settings_row.active_season_id;
  if not found then return null; end if;
  select * into daily_row from public.market_daily_limits where portfolio_id = portfolio_row.id and activity_date = public.market_brussels_date(now());
  select jsonb_build_object(
    'portfolio', jsonb_build_object('id', portfolio_row.id, 'userId', portfolio_row.user_id, 'seasonId', portfolio_row.season_id, 'startingBalanceMinor', portfolio_row.starting_balance_minor, 'cashBalanceMinor', portfolio_row.cash_balance_minor, 'currentHoldingsValueMinor', portfolio_row.current_holdings_value_minor, 'totalPortfolioValueMinor', portfolio_row.total_portfolio_value_minor, 'realisedProfitMinor', portfolio_row.realised_profit_minor, 'unrealisedProfitMinor', portfolio_row.unrealised_profit_minor, 'createdAt', portfolio_row.created_at, 'updatedAt', portfolio_row.updated_at),
    'holdings', coalesce((select jsonb_agg(jsonb_build_object('id', holding.id, 'portfolioId', holding.portfolio_id, 'playerId', holding.player_id, 'quantity', holding.quantity, 'purchasePriceMinor', holding.purchase_price_minor, 'currentValueMinor', holding.current_value_minor, 'unrealisedProfitMinor', holding.unrealised_profit_minor, 'purchasedAt', holding.purchased_at, 'updatedAt', holding.updated_at, 'player', jsonb_build_object('id', player.id, 'displayName', player.display_name, 'currentPriceMinor', player.current_price_minor, 'initialPriceMinor', player.initial_price_minor, 'availabilityStatus', player.availability_status, 'isAvailable', player.availability_status = 'available', 'dataUpdatedAt', player.data_updated_at)) order by holding.purchased_at) from public.market_holdings holding join public.market_players player on player.id = holding.player_id where holding.portfolio_id = portfolio_row.id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object('id', tx.id, 'portfolioId', tx.portfolio_id, 'playerId', tx.player_id, 'transactionType', tx.transaction_type, 'executedPriceMinor', tx.executed_price_minor, 'balanceBeforeMinor', tx.balance_before_minor, 'balanceAfterMinor', tx.balance_after_minor, 'holdingValueBeforeMinor', tx.holding_value_before_minor, 'holdingValueAfterMinor', tx.holding_value_after_minor, 'idempotencyKey', tx.idempotency_key, 'createdAt', tx.created_at, 'player', jsonb_build_object('id', player.id, 'displayName', player.display_name, 'currentPriceMinor', player.current_price_minor, 'availabilityStatus', player.availability_status)) order by tx.created_at desc) from public.market_transactions tx join public.market_players player on player.id = tx.player_id where tx.portfolio_id = portfolio_row.id), '[]'::jsonb),
    'dailyLimit', jsonb_build_object('id', coalesce(daily_row.id::text, portfolio_row.id::text || ':' || public.market_brussels_date(now())::text), 'portfolioId', portfolio_row.id, 'activityDate', public.market_brussels_date(now()), 'purchasesCount', coalesce(daily_row.purchases_count, 0), 'salesCount', coalesce(daily_row.sales_count, 0), 'createdAt', coalesce(daily_row.created_at, now()), 'updatedAt', coalesce(daily_row.updated_at, now())),
    'purchasesRemaining', greatest(0, 3 - coalesce(daily_row.purchases_count, 0)), 'salesRemaining', greatest(0, 3 - coalesce(daily_row.sales_count, 0)),
    'weeklyChangeMinor', coalesce((select sum(event.price_change_minor) from public.market_valuation_events event join public.market_holdings holding on holding.player_id = event.player_id where holding.portfolio_id = portfolio_row.id and event.effective_at >= date_trunc('week', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels'), 0),
    'allTimeProfitMinor', portfolio_row.realised_profit_minor + portfolio_row.unrealised_profit_minor
  ) into snapshot;
  return snapshot;
end;
$$;
revoke all on function public.market_get_portfolio_snapshot() from public, anon;
grant execute on function public.market_get_portfolio_snapshot() to authenticated;

-- The provider/rating valuation function is permanently fail-closed in Manual V1.
create or replace function public.market_process_valuation_event(
  p_player_id uuid, p_match_stat_id uuid, p_event_type text,
  p_previous_price_minor int, p_new_price_minor int, p_previous_bank_milli int,
  p_rating_milli int, p_baseline_rating_milli int, p_rating_delta_milli int,
  p_bank_after_event_milli int, p_price_change_minor int, p_reason text,
  p_calculation_version text, p_effective_at timestamptz, p_idempotency_key text
)
returns public.market_valuation_events language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  raise exception 'LEGACY_AUTOMATIC_VALUATION_DISABLED';
end;
$$;
revoke all on function public.market_process_valuation_event(uuid, uuid, text, int, int, int, int, int, int, int, int, text, text, timestamptz, text) from public, anon, authenticated, service_role;

-- Trusted infrastructure uses service_role; p_admin_user_id is an audited
-- acting identity and is not cryptographic proof of the caller identity.
alter function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid)
  set search_path = pg_catalog, public;
revoke all on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.market_admin_update_player_value(text, int, int, timestamptz, text, text, text, uuid) to service_role;
