import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { canBuyManualPlayer, canSellManualPlayer, isPubliclyBrowseableManualPlayer } from '../lib/market/catalogue'

const migrationUrl = new URL('../supabase/migrations/20260731_05_manual_market_database_hardening_v1.sql', import.meta.url)
async function migration() { return readFile(migrationUrl, 'utf8') }

test('manual activation requires exact fingerprint and all five declarations', async () => {
  const sql = await migration()
  for (const evidence of ['manual_schema_version = 1', 'record_count between 1 and 50', 'validation_error_count = 0', 'unresolved_warning_count = 0', 'approval_fingerprint = fingerprint', 'declaration_independently_selected', 'declaration_no_systematic_copy', 'declaration_original_values', 'declaration_manually_reviewed', 'declaration_identities_resolved', 'CATALOGUE_FINGERPRINT_MISMATCH', 'INVALID_OR_STALE_APPROVAL']) assert.ok(sql.includes(evidence), evidence)
  assert.doesNotMatch(sql.slice(sql.indexOf('create or replace function public.market_activate_catalogue'), sql.indexOf('-- Direct legacy rows')), /approved-provider|licensed-local|source_verified_at|provider permission|prior.season/i)
})

test('public surfaces expose safe projections and revoke legacy table reads', async () => {
  const sql = await migration()
  for (const surface of ['market_public_players_v1', 'market_public_value_history_v1', 'market_public_leaderboard_v1']) assert.match(sql, new RegExp(`grant execute on function public\\.${surface}`, 'i'))
  assert.match(sql, /revoke select on table public\.market_players, public\.market_valuation_events/i)
  const playerProjection = sql.slice(sql.indexOf('create or replace function public.market_public_players_v1'), sql.indexOf('create or replace function public.market_public_value_history_v1'))
  assert.doesNotMatch(playerProjection, /provider|club|position|rating|bank|source_reference|justification/i)
  assert.match(sql, /set search_path = pg_catalog, public/g)
})

test('portfolio snapshot is club independent and legacy valuation is disabled', async () => {
  const sql = await migration()
  const snapshot = sql.slice(sql.indexOf('create or replace function public.market_get_portfolio_snapshot'), sql.indexOf('-- The provider/rating'))
  assert.doesNotMatch(snapshot, /join public\.market_clubs|providerPlayerId|positionGroup/i)
  assert.match(snapshot, /join public\.market_players player on player\.id = holding\.player_id/i)
  assert.match(sql, /LEGACY_AUTOMATIC_VALUATION_DISABLED/)
  assert.match(sql, /from public, anon, authenticated, service_role/)
})

test('availability is authoritative and inactive holdings remain sellable', async () => {
  const sql = await migration()
  const transactionSql = await readFile(new URL('../supabase/migrations/20260731_03_market_foundation_completion_v1.sql', import.meta.url), 'utf8')
  const buyFunction = transactionSql.slice(transactionSql.indexOf('create or replace function public.market_buy_player'), transactionSql.indexOf('create or replace function public.market_sell_player'))
  const sellFunction = transactionSql.slice(transactionSql.indexOf('create or replace function public.market_sell_player'), transactionSql.indexOf('create or replace function public.market_get_portfolio_snapshot'))
  assert.match(sql, /new\.is_available := new\.availability_status = 'available'/)
  assert.match(sql, /availability_status in \('available', 'sell_only'\)/)
  assert.doesNotMatch(sql.slice(sql.indexOf('market_public_players_v1'), sql.indexOf('market_public_value_history_v1')), /'inactive'/)
  assert.match(buyFunction, /if not player_row\.is_available then raise exception 'PLAYER_UNAVAILABLE'/)
  assert.doesNotMatch(sellFunction, /is_available|availability_status|PLAYER_UNAVAILABLE/)
  assert.match(sellFunction, /proceeds := player_row\.current_price_minor/)
  assert.match(sellFunction, /'sell', player_row\.current_price_minor/)
  assert.equal(canBuyManualPlayer('available'), true)
  assert.equal(canBuyManualPlayer('sell_only'), false)
  assert.equal(canBuyManualPlayer('inactive'), false)
  assert.equal(canSellManualPlayer('available'), true)
  assert.equal(canSellManualPlayer('sell_only'), true)
  assert.equal(canSellManualPlayer('inactive'), true)
  assert.equal(isPubliclyBrowseableManualPlayer('inactive'), false)
})

test('manual admin path remains service-role plus market_admins protected', async () => {
  const hardening = await migration()
  const manual = await readFile(new URL('../supabase/migrations/20260731_04_manual_market_v1.sql', import.meta.url), 'utf8')
  assert.match(manual, /ADMIN_REQUIRED/)
  assert.match(hardening, /grant execute on function public\.market_admin_update_player_value[\s\S]+to service_role/i)
  assert.doesNotMatch(hardening, /grant execute on function public\.market_admin_update_player_value[\s\S]+to authenticated/i)
  assert.match(hardening, /audited[\s\S]+not cryptographic proof/i)
})
