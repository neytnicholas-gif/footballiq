import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('Player Market launch gates', () => {
  it('makes future database functions private until explicitly granted', () => {
    const sql = read('supabase/migrations/20260811133000_secure_function_defaults.sql')
    expect(sql).toContain('alter default privileges in schema public')
    expect(sql).toContain('revoke execute on functions from public, anon, authenticated')
  })

  it('covers every rewards/profile foreign key flagged by the live performance advisor', () => {
    const sql = read('supabase/migrations/20260811134000_index_progression_foreign_keys.sql')
    for (const column of ['active_avatar', 'active_background', 'active_frame', 'challenge_key', 'item_key']) {
      expect(sql).toContain(`(${column})`)
    }
  })

  it('revokes every security-definer function explicitly and pins its search path', () => {
    const migrationDir = path.join(process.cwd(), 'supabase/migrations')
    const migrations = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort()
    const allSql = migrations.map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n').toLowerCase()
    const definitions = [...allSql.matchAll(/create or replace function\s+([a-z0-9_.]+)\s*\([^$]*?security definer\s+set search_path\s*=\s*([^\n]+?)\s+as\s+\$\$/g)]
    const revokedFunctions = [...allSql.matchAll(/revoke all on function\s+([\s\S]*?)\s+from\s+/g)].map((match) => match[1]!)
    expect(definitions.length).toBeGreaterThan(10)
    for (const definition of definitions) {
      const functionName = definition[1]!
      expect(definition[2], `${functionName} must pin search_path`).toMatch(/pg_catalog|''/)
      expect(revokedFunctions.some((block) => block.includes(`${functionName}(`)), `${functionName} must have an explicit revoke`).toBe(true)
    }
  })

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

  it('publishes a cached, privacy-safe player ownership percentage', () => {
    const sql = read('supabase/migrations/20260810200000_publish_market_ownership_percentage.sql')
    const route = read('app/api/market/catalogue/route.ts')
    const browser = read('components/market/player-market-browser.tsx')
    const detail = read('components/market/player-market-detail.tsx')
    expect(sql).toContain('count(distinct portfolio.user_id)')
    expect(sql).toContain('security definer')
    expect(sql).toContain('no identities or raw totals')
    expect(route).toContain('ownership_percentage')
    expect(browser).toContain('% of teams')
    expect(detail).toContain('% of teams')
  })

  it('runs server work close to the database with Fluid Compute enabled', () => {
    const config = read('vercel.json')
    expect(config).toContain('"fluid": true')
    expect(config).toContain('"dub1"')
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

  it('refreshes catalogue prices and skips processed player appearances without losing late fixture ratings', () => {
    const client = read('lib/market/client.ts')
    const sportmonks = read('lib/market/server/sportmonks-client.ts')
    const engine = read('lib/market/server/gameweek-engine.ts')
    expect(client).toContain('VERIFIED_CATALOGUE_TTL_MS = 300_000')
    expect(client).not.toContain("fetch('/api/market/catalogue', { cache: 'no-store' })")
    expect(sportmonks).toContain('processedPerformanceKeys.has(`${providerFixtureId}:${playerId}`)')
    expect(sportmonks).not.toContain('processedFixtureIds.has(String(fixture.id))')
    expect(engine).toContain("select('provider_fixture_id,player:market_players!inner(provider_player_id)')")
    expect(engine).toContain('.range(from, from + 999)')
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

  it('lets only authenticated league owners delete private leagues through an explicit confirmation', () => {
    const sql = read('supabase/migrations/20260810150000_add_friend_league_owner_delete.sql')
    const client = read('lib/market/client.ts')
    const leagues = read('components/market/player-market-leagues.tsx')
    expect(sql).toContain('uid uuid := auth.uid()')
    expect(sql).toContain('owner_user_id = uid')
    expect(sql).toContain("set statement_timeout = '4s'")
    expect(sql).toContain('revoke all on function public.market_delete_friend_league(bigint) from public, anon, authenticated, service_role')
    expect(sql).toContain('grant execute on function public.market_delete_friend_league(bigint) to authenticated')
    expect(client).toContain("rpc('market_delete_friend_league'")
    expect(leagues).toContain('role="alertdialog"')
    expect(leagues).toContain('Player portfolios, balances, and trades are not affected.')
    expect(leagues).not.toContain('window.confirm')
  })

  it('uses deterministic Brussels timestamps across server render and browser hydration', () => {
    const format = read('lib/market/format.ts')
    const portfolio = read('components/market/player-market-portfolio.tsx')
    const detail = read('components/market/player-market-detail.tsx')
    expect(format).toContain("new Intl.DateTimeFormat('en-GB'")
    expect(format).toContain("timeZone: 'Europe/Brussels'")
    expect(portfolio).toContain('formatMarketDateTime(tx.created_at)')
    expect(detail).toContain('formatMarketDateTime(player.value_updated_at)')
    expect(`${portfolio}\n${detail}`).not.toContain('.toLocaleString()')
  })

  it('hydrates the live daily countdown from a stable server-safe placeholder', () => {
    const daily = read('components/daily-challenge.tsx')
    expect(daily).toContain("const [dailyKey, setDailyKey] = useState('')")
    expect(daily).toContain('useState<number | null>(null)')
    expect(daily).toContain("displayDate || 'Loading today…'")
    expect(daily).toContain("secondsLeft === null ? '--:--:--'")
    expect(daily).toContain('updateClock()')
  })

  it('shows the live 1-4-3-3 holdings roster immediately above market controls', () => {
    const browser = read('components/market/player-market-browser.tsx')
    expect(browser).toContain('Your roster · 1-4-3-3')
    expect(browser).toContain("{ position: 'GK', label: 'Goalkeeper', slots: 1 }")
    expect(browser).toContain("{ position: 'DEF', label: 'Defenders', slots: 4 }")
    expect(browser).toContain("{ position: 'MID', label: 'Midfielders', slots: 3 }")
    expect(browser).toContain("{ position: 'FWD', label: 'Forwards', slots: 3 }")
    expect(browser).toContain('min-w-[880px] grid-cols-11')
    expect(browser).toContain('id="live-roster"')
    expect(browser).toContain('formatFiqCompact(player.current_value)')
    expect(browser).toContain('Squad value')
    expect(browser).toContain('Total spent')
    expect(browser).toContain('Budget left')
    expect(browser).toContain('href="/market/roster"')
    expect(browser.indexOf('<MarketRosterBoard')).toBeLessThan(browser.indexOf('placeholder="Player or club"'))
  })

  it('returns from a player card directly to the live roster', () => {
    const detail = read('components/market/player-market-detail.tsx')
    expect(detail).toContain('href="/market/roster"')
    expect(detail).toContain('Back to full roster')
  })

  it('shows player prices and budget totals on the full roster page', () => {
    const portfolio = read('components/market/player-market-portfolio.tsx')
    expect(portfolio).toContain('Your full roster')
    expect(portfolio).toContain('Budget remaining')
    expect(portfolio).toContain('Total spent')
    expect(portfolio).toContain('Current squad value')
    expect(portfolio).toContain('formatFiqCompact(player.current_value)')
  })

  it('keeps market decisions and trade feedback visible during squad building', () => {
    const browser = read('components/market/player-market-browser.tsx')
    expect(browser).toContain("type CatalogueScope = 'all' | 'squad' | 'watchlist' | 'affordable'")
    expect(browser).toContain('My squad · {holdings.length}')
    expect(browser).toContain('Watchlist · {watchlist.length}')
    expect(browser).toContain('Affordable fits')
    expect(browser).toContain('Next move: add a ${nextPosition}')
    expect(browser).toContain('average budget per open place')
    expect(browser).toContain('fixed inset-x-4 bottom-4')
    expect(browser).toContain('aria-label="Dismiss message"')
  })

  it('tolerates catalogue rows without an optional provider label', () => {
    const market = `${read('components/market/player-market-browser.tsx')}\n${read('components/market/player-market-home.tsx')}`
    expect(market).not.toContain('data_source_label.includes(')
    expect(market).toContain("data_source_label?.includes('preview valuation experiment')")
  })

  it('provides a first-class roster route with a formation board and player dossiers', () => {
    const route = read('app/market/roster/page.tsx')
    const roster = read('components/market/player-market-portfolio.tsx')
    const navigation = read('components/market/market-navigation.tsx')
    expect(route).toContain("from '../portfolio/page'")
    expect(navigation).toContain("href: '/market/roster'")
    expect(navigation).toContain("label: 'Roster'")
    expect(roster).toContain('Full-screen roster')
    expect(roster).toContain('Your {activeFormation} team')
    expect(roster).toContain('Tap any player to open their full stats')
    expect(roster).toContain('href={`/market/player/${encodeURIComponent(player.slug)}`}')
    expect(roster).toContain('ownership_percentage')
    expect(roster).not.toContain('<Link role="listitem"')
    expect(roster).toContain('aria-label={`Open ${player.display_name} details`}')
  })

  it('turns backend failures into safe player-facing market messages', () => {
    const client = read('lib/market/client.ts')
    const readErrors = read('lib/market/user-errors.ts')
    expect(client).toContain('That action could not be completed. Nothing changed')
    expect(client).toContain('You have used all 11 signings for this gameweek.')
    expect(readErrors).toContain('Your roster and budget were not changed.')
  })

  it('does not let a first quiz answer race the saved-progress check', () => {
    const quiz = read('components/choice-quiz.tsx')
    expect(quiz).toContain('if (checkingProgress || resumeState || selected !== null) return')
    expect(quiz).toContain('disabled={checkingProgress || Boolean(resumeState) || selected !== null}')
  })
})
