import { supabase } from '@/lib/supabase'
import {
  createMarketRequestKey,
  MARKET_DAILY_BUY_LIMIT,
  MARKET_DAILY_SELL_LIMIT,
  toUtcDateKey,
} from '@/lib/market/format'
import {
  anonymousApplySimulatedMatchweek,
  anonymousBuyPlayer,
  anonymousLatestRun,
  anonymousRuns,
  anonymousSellPlayer,
  anonymousToggleWatchlist,
  applyAnonymousOverrides,
  buildAnonymousPortfolio,
  clearAnonymousState,
  readAnonymousState,
} from '@/lib/market/anonymous-state'
import { buildSampleMarketPlayers, buildSampleSeasonStats } from '@/lib/market/sample-data'
import { loadLatestReveal, loadRevealHistory } from '@/lib/market/reveal'
import type {
  MarketFriendLeague,
  MarketFriendLeagueLeaderboardRow,
  MarketFriendLeagueMember,
  MarketHolding,
  MarketLeaderboardRow,
  MarketMatchweekApplyResult,
  MarketMatchweekRun,
  MarketPlayer,
  MarketPortfolio,
  MarketRevealSummary,
  MarketSeasonStats,
  MarketTransaction,
  MarketValueHistoryPoint,
} from '@/lib/market/types'

function isMarketBackendUnavailable(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const row = error as { code?: string; message?: string }
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(row.code ?? '')
    || /could not find (the table|the function)|relation .* does not exist|function .* does not exist/i.test(row.message ?? '')
}

export type GuestMarketImportResult = {
  ok: boolean
  imported: boolean
  reason?: 'already_imported' | 'account_already_initialized'
  holdings?: number
  watchlist?: number
  available_balance?: number
  pricing?: 'current_market_value'
}

export async function importAnonymousMarketStateToAccount() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return { data: null, error: authError as Error | null }
  }

  const state = readAnonymousState()
  const hasGuestProgress = state.holdings.length > 0 || state.watchlist.length > 0
  if (!hasGuestProgress) return { data: null, error: null }

  const { data: players, error: playersError } = await loadMarketPlayers()
  if (playersError) return { data: null, error: playersError }

  const playersById = new Map(players.map((player) => [player.id, player]))
  const playerSlugs = state.holdings
    .map((holding) => playersById.get(holding.player_id)?.slug)
    .filter((slug): slug is string => Boolean(slug))
  const watchlistSlugs = state.watchlist
    .map((playerId) => playersById.get(playerId)?.slug)
    .filter((slug): slug is string => Boolean(slug))

  if (playerSlugs.length !== state.holdings.length) {
    return { data: null, error: new Error('Guest portfolio could not be matched to the current player catalogue.') }
  }

  const { data, error } = await supabase.rpc('market_import_guest_squad', {
    p_player_slugs: playerSlugs,
    p_watchlist_slugs: watchlistSlugs,
  })

  if (error) return { data: null, error: error as Error }

  const result = (data as GuestMarketImportResult | null) ?? null
  if (result?.ok) {
    clearAnonymousState()
    try {
      window.sessionStorage.setItem('fiq-market-account-import-result-v1', JSON.stringify(result))
      window.dispatchEvent(new CustomEvent('fiq-market-account-imported', { detail: result }))
    } catch {
      // The import is already durable; a blocked status banner is non-critical.
    }
  }

  return { data: result, error: null }
}

export async function refreshMyMarketPortfolio() {
  const { error } = await supabase.rpc('market_refresh_my_portfolio', {})
  return { error: error as Error | null }
}

export async function loadMarketPlayers() {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  const { data, error } = await supabase
    .from('market_players')
    .select('*')
    .eq('active', true)
    .order('current_value', { ascending: false })

  const remoteRows = ((data as MarketPlayer[] | null) ?? [])
  let rows = remoteRows
  const usingFallback = rows.length === 0 || Boolean(error)
  if (usingFallback) {
    try {
      const response = await fetch('/api/market/catalogue')
      const payload = response.ok ? await response.json() as { players?: MarketPlayer[] } : null
      rows = Array.isArray(payload?.players) && payload.players.length > 0 ? payload.players : buildSampleMarketPlayers()
    } catch {
      rows = buildSampleMarketPlayers()
    }
  }

  if (!user) {
    const anonState = readAnonymousState()
    rows = applyAnonymousOverrides(rows, anonState)
  }

  return {
    data: rows,
    // Missing optional Market tables are an expected preview state. The UI
    // already labels these rows as demonstration data, so do not expose raw
    // database schema errors to public visitors.
    error: usingFallback ? null : error as Error | null,
  }
}

export async function loadMarketSettings() {
  const { data, error } = await supabase
    .from('market_settings')
    .select('market_status,methodology_version,last_market_update_at,max_portfolio_size,sell_spread_bps,season_id,season_label,season_state,onboarding_enabled')
    .eq('singleton', true)
    .maybeSingle()

  return {
    data: (data as {
      market_status: 'open' | 'updating' | 'paused'
      methodology_version: string
      last_market_update_at: string | null
      max_portfolio_size: number
      sell_spread_bps: number
      season_id: string
      season_label: string
      season_state: 'setup' | 'open' | 'paused' | 'archived'
      onboarding_enabled: boolean
    } | null) ?? null,
    error: error as Error | null,
  }
}

export async function loadPlayerSeasonStats(playerId: number) {
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('season', { ascending: false })

  return {
    data: (data as MarketSeasonStats[] | null) ?? [],
    error: isMarketBackendUnavailable(error) ? null : error as Error | null,
  }
}

export async function loadMarketSeasonStats() {
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .order('season', { ascending: false })

  let rows = (data as MarketSeasonStats[] | null) ?? []
  const usingFallback = rows.length === 0 || Boolean(error)
  if (usingFallback) {
    rows = buildSampleSeasonStats(buildSampleMarketPlayers())
  }

  return {
    data: rows,
    error: usingFallback ? null : error as Error | null,
  }
}

export async function loadPlayerValueHistory(playerId: number) {
  const { data, error } = await supabase
    .from('market_value_history')
    .select('*')
    .eq('player_id', playerId)
    .order('recorded_at', { ascending: true })
    .limit(60)

  return {
    data: (data as MarketValueHistoryPoint[] | null) ?? [],
    error: isMarketBackendUnavailable(error) ? null : error as Error | null,
  }
}

export async function loadMyPortfolioData() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    const anon = buildAnonymousPortfolio(players, readAnonymousState())
    return { error: null, portfolio: anon.portfolio, holdings: anon.holdings, transactions: anon.transactions, watchlist: anon.watchlist }
  }
  if (authError) return { error: authError as Error, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }

  const userId = authData.user.id

  const [{ data: portfolioData, error: portfolioError }, { data: holdingsData, error: holdingsError }, { data: transactionsData, error: transactionsError }, { data: watchlistData, error: watchlistError }] = await Promise.all([
    supabase.from('market_portfolios').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('market_holdings').select('*').eq('user_id', userId).order('acquired_at', { ascending: true }),
    supabase.from('market_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('market_watchlist').select('player_id').eq('user_id', userId),
  ])

  const error = portfolioError ?? holdingsError ?? transactionsError ?? watchlistError

  if (isMarketBackendUnavailable(error)) {
    const { data: players } = await loadMarketPlayers()
    const anon = buildAnonymousPortfolio(players, readAnonymousState())
    return { error: null, portfolio: anon.portfolio, holdings: anon.holdings, transactions: anon.transactions, watchlist: anon.watchlist }
  }

  return {
    error: (error as Error | null) ?? null,
    portfolio: (portfolioData as MarketPortfolio | null) ?? null,
    holdings: (holdingsData as MarketHolding[] | null) ?? [],
    transactions: (transactionsData as MarketTransaction[] | null) ?? [],
    watchlist: ((watchlistData as Array<{ player_id: number }> | null) ?? []).map((row) => row.player_id),
  }
}

export async function loadMarketLeaderboard(metric: 'daily_gain' | 'weekly_gain' | 'monthly_gain' | 'season_gain' | 'all_time_gain' | 'total_account_value') {
  const { data, error } = await supabase
    .from('market_public_leaderboard')
    .select('*')
    .order(metric, { ascending: false })
    .limit(100)

  return {
    data: (data as MarketLeaderboardRow[] | null) ?? [],
    error: error as Error | null,
  }
}

export function calculateTradesRemaining(transactions: MarketTransaction[]) {
  const today = toUtcDateKey()
  const todays = transactions.filter((transaction) => transaction.trade_date_utc === today)
  const buysUsed = todays.filter((transaction) => transaction.transaction_type === 'buy').length
  const salesUsed = todays.filter((transaction) => transaction.transaction_type === 'sell').length

  return {
    buysRemaining: Math.max(0, MARKET_DAILY_BUY_LIMIT - buysUsed),
    salesRemaining: Math.max(0, MARKET_DAILY_SELL_LIMIT - salesUsed),
    buysUsed,
    salesUsed,
  }
}

export async function buyMarketPlayer(slug: string) {
  const idempotencyKey = createMarketRequestKey(`buy-${slug}`)

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousBuyPlayer(players, slug, idempotencyKey)
  }

  const { data, error } = await supabase.rpc('market_buy_player', {
    p_player_slug: slug,
    p_idempotency_key: idempotencyKey,
  })

  if (isMarketBackendUnavailable(error)) {
    const { data: players } = await loadMarketPlayers()
    return anonymousBuyPlayer(players, slug, idempotencyKey)
  }

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function sellMarketPlayer(slug: string) {
  const idempotencyKey = createMarketRequestKey(`sell-${slug}`)

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousSellPlayer(players, slug, idempotencyKey)
  }

  const { data, error } = await supabase.rpc('market_sell_player', {
    p_player_slug: slug,
    p_idempotency_key: idempotencyKey,
  })

  if (isMarketBackendUnavailable(error)) {
    const { data: players } = await loadMarketPlayers()
    return anonymousSellPlayer(players, slug, idempotencyKey)
  }

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function toggleMarketWatchlist(slug: string) {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousToggleWatchlist(slug, players)
  }

  const { data, error } = await supabase.rpc('market_toggle_watchlist', {
    p_player_slug: slug,
  })

  if (isMarketBackendUnavailable(error)) {
    const { data: players } = await loadMarketPlayers()
    return anonymousToggleWatchlist(slug, players)
  }

  return {
    data: (data as { watchlisted?: boolean } | null) ?? null,
    error: error as Error | null,
  }
}

export async function loadMyFriendLeagues() {
  const untyped = supabase as any
  const [{ data: leaguesData, error: leaguesError }, { data: memberData, error: memberError }] = await Promise.all([
    untyped.from('market_friend_leagues').select('*').order('created_at', { ascending: false }),
    untyped.from('market_friend_league_members').select('*').order('joined_at', { ascending: true }),
  ])

  const leagues = (leaguesData as MarketFriendLeague[] | null) ?? []
  const members = (memberData as MarketFriendLeagueMember[] | null) ?? []

  let leaderboard: MarketFriendLeagueLeaderboardRow[] = []
  if (leagues.length > 0) {
    const leagueIds = leagues.map((league) => league.id)
    const { data: leaderboardData, error: leaderboardError } = await untyped
      .from('market_friend_league_leaderboard')
      .select('*')
      .in('league_id', leagueIds)
      .order('league_id', { ascending: true })
      .order('rank', { ascending: true })

    if (!leaderboardError) {
      leaderboard = (leaderboardData as unknown as MarketFriendLeagueLeaderboardRow[] | null) ?? []
    } else if (!leaguesError && !memberError) {
      return { leagues, members, leaderboard, error: leaderboardError as Error }
    }
  }

  return {
    leagues,
    members,
    leaderboard,
    error: (leaguesError ?? memberError ?? null) as Error | null,
  }
}

export async function createFriendLeague(name: string) {
  const { data, error } = await (supabase as any).rpc('market_create_friend_league', {
    p_name: name,
  })

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function joinFriendLeague(leagueCode: string) {
  const { data, error } = await (supabase as any).rpc('market_join_friend_league', {
    p_league_code: leagueCode,
  })

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function leaveFriendLeague(leagueId: number) {
  const { data, error } = await (supabase as any).rpc('market_leave_friend_league', {
    p_league_id: leagueId,
  })

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function applySimulatedMatchweek(weekLabel: string, playerUpdates: Array<Record<string, unknown>>) {
  if (process.env.NODE_ENV !== 'development') {
    return {
      data: null,
      error: new Error('Simulated matchweeks are development-only and cannot run in production.'),
    }
  }

  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousApplySimulatedMatchweek(players, weekLabel, playerUpdates)
  }

  const { data, error } = await (supabase as any).rpc('market_apply_simulated_matchweek', {
    p_week_label: weekLabel,
    p_player_updates: playerUpdates,
    p_methodology_version: 'v1.0.0-sim-v1',
  })

  return {
    data: (data as MarketMatchweekApplyResult | null) ?? null,
    error: error as Error | null,
  }
}

export async function loadLatestMatchweekRun() {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return {
      data: anonymousLatestRun(),
      error: null,
    }
  }

  const { data, error } = await (supabase as any)
    .from('market_matchweek_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: (data as MarketMatchweekRun | null) ?? null,
    error: error as Error | null,
  }
}

export async function loadMatchweekRuns(limit = 12): Promise<{ data: MarketMatchweekRun[]; error: Error | null }> {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return {
      data: anonymousRuns(limit),
      error: null,
    }
  }

  const { data, error } = await (supabase as any)
    .from('market_matchweek_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return {
    data: (data as MarketMatchweekRun[] | null) ?? [],
    error: error as Error | null,
  }
}

export async function loadMyRevealHistory(limit = 12): Promise<{ data: MarketRevealSummary[]; error: Error | null }> {
  const { data: authData } = await supabase.auth.getUser()
  const scopeKey = authData.user?.id ?? 'anon'
  return {
    data: loadRevealHistory(scopeKey, limit),
    error: null,
  }
}

export async function loadMyLatestReveal(): Promise<{ data: MarketRevealSummary | null; error: Error | null }> {
  const { data: authData } = await supabase.auth.getUser()
  const scopeKey = authData.user?.id ?? 'anon'
  return {
    data: loadLatestReveal(scopeKey),
    error: null,
  }
}
