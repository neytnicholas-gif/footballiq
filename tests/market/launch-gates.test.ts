import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('Player Market launch gates', () => {
  it('serves the catalogue outside Preview with an authoritative opening baseline', () => {
    const route = read('app/api/market/catalogue/route.ts')
    expect(route).not.toContain("VERCEL_ENV !== 'preview'")
    expect(route).toContain('opening_price_minor')
    expect(route).toContain("client.rpc('market_public_catalogue_v1', {")
    expect(route).toContain('Promise.all(keys.map')
    expect(route).toContain('p_competition_key: key')
    expect(route).toContain('unstable_cache')
    expect(route).toContain("tags: ['market-public-catalogue']")
    expect(route).not.toContain('buildSportmonksCombinedCatalogue')
    expect(route).toContain('s-maxage=300')
    expect(route).toContain('stale-while-revalidate=86400')
    expect(route).toContain("event: 'market.catalogue.failed'")
    expect(route).toContain("'Retry-After': '30'")
  })

  it('publishes only verified database catalogue rows and removes broad public writes', () => {
    const sql = read('supabase/migrations/20260809234500_publish_database_backed_market_catalogue.sql')
    expect(sql).toContain('market_public_catalogue_v1')
    expect(sql).toContain('security invoker')
    expect(sql).toContain('catalogue.status = \'active\'')
    expect(sql).toContain('revoke insert, update, delete, truncate, references, trigger')
    const filtered = read('supabase/migrations/20260810003500_filter_public_market_catalogue.sql')
    expect(filtered).toContain('market_public_catalogue_v1(p_competition_key text)')
    expect(filtered).toContain('season.competition_key = p_competition_key')
    const encodingRepair = read('supabase/migrations/20260810004500_repair_market_text_encoding.sql')
    expect(encodingRepair).toContain("convert_from(convert_to(display_name, 'LATIN1'), 'UTF8')")
    expect(read('lib/market/server/sportmonks-client.ts')).toContain("Buffer.from(trimmed, 'latin1').toString('utf8')")
  })

  it('never fakes authenticated trade success using anonymous state', () => {
    const client = read('lib/market/client.ts')
    const buy = client.slice(client.indexOf('export async function buyMarketPlayer'), client.indexOf('export async function sellMarketPlayer'))
    const sell = client.slice(client.indexOf('export async function sellMarketPlayer'), client.indexOf('export async function toggleMarketWatchlist'))
    expect(buy.match(/anonymousBuyPlayer/g)).toHaveLength(1)
    expect(sell.match(/anonymousSellPlayer/g)).toHaveLength(1)
    expect(buy).not.toContain('isMarketBackendUnavailable(error)')
    expect(sell).not.toContain('isMarketBackendUnavailable(error)')
    const watchlist = client.slice(client.indexOf('export async function toggleMarketWatchlist'), client.indexOf('export async function loadMyFriendLeagues'))
    expect(watchlist.match(/anonymousToggleWatchlist/g)).toHaveLength(1)
    expect(watchlist).not.toContain('isMarketBackendUnavailable(error)')
  })

  it('fails closed and quickly during unattended market incidents', () => {
    const sql = read('supabase/migrations/20260810123000_harden_unattended_market_operations.sql')
    const statusSql = read('supabase/migrations/20260810123500_add_market_operational_status.sql')
    const client = read('lib/market/client.ts')
    expect(sql).toContain('market_holdings_require_open_market')
    expect(sql).toContain("status is distinct from 'open'")
    expect(sql).toContain("MARKET_TEMPORARILY_UNAVAILABLE")
    expect(sql).toContain("market_buy_player(text, text) set statement_timeout = '5s'")
    expect(sql).toContain("market_sell_player(text, text) set lock_timeout = '2s'")
    expect(statusSql).toContain("check (market_status in ('open','updating','paused'))")
    expect(client).toContain(".select('market_status,updated_at,maximum_holdings,active_season_id')")
    expect(client).toContain('No change was made')
    expect(client).toContain("['57014', '55P03', 'PGRST003']")
  })

  it('does not substitute browser-local Reveals for a signed-in account', () => {
    const client = read('lib/market/client.ts')
    const reveals = client.slice(client.indexOf('export async function loadMyRevealHistory'), client.indexOf('export async function loadMyLatestReveal'))
    expect(reveals).toContain("rpc('market_my_reveals'")
    expect(reveals).toContain("error: error ? error as Error")
    expect(reveals.indexOf('loadRevealHistory')).toBeGreaterThan(reveals.indexOf('if (authData.user)'))
  })

  it('refreshes catalogue prices and skips already processed paid fixture calls', () => {
    const client = read('lib/market/client.ts')
    const sportmonks = read('lib/market/server/sportmonks-client.ts')
    const engine = read('lib/market/server/gameweek-engine.ts')
    expect(client).toContain('VERIFIED_CATALOGUE_TTL_MS = 300_000')
    expect(client).not.toContain("fetch('/api/market/catalogue', { cache: 'no-store' })")
    expect(sportmonks).toContain('processedFixtureIds.has(String(fixture.id))')
    expect(engine).toContain("select('provider_fixture_id')")
    expect(engine).toContain('verified-gameweek-heartbeat:')
  })

  it('keeps high-traffic market reads bounded and free of page-view writes', () => {
    const client = read('lib/market/client.ts')
    const pages = [
      read('app/market/players/page.tsx'),
      read('app/market/portfolio/page.tsx'),
      read('app/market/player/[slug]/page.tsx'),
      read('components/market/player-market-home.tsx'),
    ].join('\n')
    const scaleSql = read('supabase/migrations/20260810082824_scale_market_public_reads.sql')
    expect(client).not.toContain('export async function refreshMyMarketPortfolio')
    expect(client).not.toContain('export async function loadMarketSeasonStats')
    expect(pages).not.toContain('refreshMyMarketPortfolio')
    expect(pages).not.toContain('loadMarketSeasonStats')
    expect(scaleSql).toContain('limit 30')
    expect(scaleSql).toContain('market_transactions_portfolio_date_idx')
  })

  it('removes obsolete RPCs and indexes rolling appearances', () => {
    const sql = read('supabase/migrations/20260809223000_close_final_market_launch_gates.sql')
    expect(sql).toContain('drop function if exists public.market_buy_player(uuid, text, integer)')
    expect(sql).toContain('drop function if exists public.market_sell_player(uuid, text)')
    expect(sql).toContain('market_player_match_stats_player_fixture_date_idx')
    const revoked = read('supabase/migrations/20260810002000_revoke_obsolete_market_rpcs.sql')
    expect(revoked).toContain('market_public_players_v1() from public, anon, authenticated')
    expect(revoked).toContain('market_get_portfolio_snapshot() from public, anon, authenticated')
  })

  it('protects provider diagnostics and publishes security headers', () => {
    expect(read('app/api/market/sportmonks-trial/route.ts')).toContain('isMarketAdminRequest')
    expect(read('app/api/market/provider-trial/route.ts')).toContain('isMarketAdminRequest')
    expect(read('next.config.mjs')).toContain('Content-Security-Policy')
  })
})
