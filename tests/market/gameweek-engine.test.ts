import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const foundation = readFileSync('supabase/migrations/20260809203000_market_gameweek_engine.sql', 'utf8')
const migration = readFileSync('supabase/migrations/20260809213000_harden_verified_gameweek_pipeline.sql', 'utf8')
const portfolioRepair = readFileSync('supabase/migrations/20260809214500_keep_portfolio_prices_authoritative.sql', 'utf8')
const priceBook = readFileSync('supabase/migrations/20260809215500_publish_authoritative_price_book.sql', 'utf8')
const catalogueRoute = readFileSync('app/api/market/catalogue/route.ts', 'utf8')
const priceBookGrants = readFileSync('supabase/migrations/20260809220000_grant_price_book_sources.sql', 'utf8')
const publicCatalogue = readFileSync('supabase/migrations/20260809234500_publish_database_backed_market_catalogue.sql', 'utf8')
const transferRollover = readFileSync('supabase/migrations/20260810144500_close_expired_transfer_gameweeks.sql', 'utf8')
const residualBank = readFileSync('supabase/migrations/20260810170000_bank_subthreshold_market_performance.sql', 'utf8')
const route = readFileSync('app/api/market/process-gameweek/route.ts', 'utf8')
const runtime = readFileSync('lib/market/server/gameweek-engine.ts', 'utf8')

describe('verified gameweek engine', () => {
  it('closes expired transfer windows before returning the current gameweek', () => {
    expect(transferRollover).toContain("gameweek_type = 'transfer'")
    expect(transferRollover).toContain("state = 'closed'")
    expect(transferRollover).toContain('closes_at <= now()')
    expect(transferRollover).toContain("where gameweek_type = 'transfer';")
  })
  it('uses exact-once fixture and player identities', () => {
    expect(foundation).toContain('market_player_match_stats_fixture_player_uidx')
    expect(migration).toContain('on conflict(provider_fixture_id,player_id) do nothing')
    expect(migration).toContain("'sportmonks:'||(item->>'provider_fixture_id')||':'||(item->>'provider_player_id')")
    expect(runtime).toContain("processedPerformanceKeys.add(`${row.provider_fixture_id}:${providerPlayerId}`)")
    expect(runtime).toContain('.range(from, from + 999)')
  })

  it('enforces 11 signings per gameweek in the database', () => {
    expect(foundation).toContain('signings_used between 0 and 11')
    expect(foundation).toContain("if a.signings_used>=11 then raise exception 'GAMEWEEK_TRANSFER_LIMIT'")
    expect(foundation).toContain("perform public.market_record_gameweek_trade(p.id,'buy')")
  })

  it('keeps processing service-role-only and user reveals owner-scoped', () => {
    expect(migration).not.toContain('auth.role()')
    expect(foundation).toContain('market_gameweek_reveals_owner_read')
    expect(migration).toContain('p.user_id=(select auth.uid())')
    expect(migration).toContain('security_invoker=true')
  })

  it('uses rolling form, a weekly cap, and bulk portfolio updates', () => {
    expect(migration).toContain('order by s.fixture_date desc,s.imported_at desc limit 5')
    expect(migration).toContain('600000')
    expect(migration).toContain('with totals as')
    expect(migration).not.toContain('for pf in select id from public.market_portfolios')
  })

  it('banks sub-threshold verified rating signals without losing them', () => {
    expect(residualBank).toContain('bank_before:=mp.performance_bank_milli+bounded_signal')
    expect(residualBank).toContain('available_steps:=trunc(bank_before/220.0)::integer')
    expect(residualBank).toContain('performance_bank_milli=bank_after')
    expect(residualBank).toContain("'fiq-real-performance-v2.1.0'")
    expect(residualBank).toContain('on conflict(provider_fixture_id,player_id) do nothing')
  })

  it('uses the player price as the authoritative value in every portfolio read', () => {
    expect(portfolioRepair).toContain("'current_value_snapshot',mp.current_price_minor")
    expect(portfolioRepair).toContain("'total_account_value',p.cash_balance_minor+live_holdings")
    expect(portfolioRepair).toContain('update public.market_holdings h set')
  })

  it('serves one database price consistently across market and portfolio surfaces', () => {
    expect(priceBook).toContain('market_public_price_book_v1')
    expect(priceBook).toContain('security invoker')
    expect(catalogueRoute).toContain("client.rpc('market_public_catalogue_v1', {")
    expect(publicCatalogue).toContain('security invoker')
    expect(publicCatalogue).toContain('player.current_price_minor')
    expect(catalogueRoute).not.toContain('applyPreviewValueExperiment')
    expect(priceBookGrants).toContain('grant select on table public.market_valuation_events to anon,authenticated')
  })

  it('requires a server secret at the cron boundary', () => {
    expect(route).toContain('process.env.CRON_SECRET')
    expect(route).toContain('process.env.MARKET_ADMIN_SECRET')
    expect(route).toContain("supplied === `Bearer ${secret}`")
  })
})
