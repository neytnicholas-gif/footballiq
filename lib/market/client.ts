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
  if (rows.length === 0 || error) {
    rows = buildSampleMarketPlayers()
  }

  if (!user) {
    const anonState = readAnonymousState()
    rows = applyAnonymousOverrides(rows, anonState)
  }

  return {
    data: rows,
    error: error as Error | null,
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
    error: error as Error | null,
  }
}

export async function loadMarketSeasonStats() {
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .order('season', { ascending: false })

  let rows = (data as MarketSeasonStats[] | null) ?? []
  if (rows.length === 0 || error) {
    rows = buildSampleSeasonStats(buildSampleMarketPlayers())
  }

  return {
    data: rows,
    error: error as Error | null,
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
    error: error as Error | null,
  }
}

export async function loadMyPortfolioData() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) return { error: authError as Error, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    const anon = buildAnonymousPortfolio(players, readAnonymousState())
    return { error: null, portfolio: anon.portfolio, holdings: anon.holdings, transactions: anon.transactions, watchlist: anon.watchlist }
  }

  const userId = authData.user.id

  const [{ data: portfolioData, error: portfolioError }, { data: holdingsData, error: holdingsError }, { data: transactionsData, error: transactionsError }, { data: watchlistData, error: watchlistError }] = await Promise.all([
    supabase.from('market_portfolios').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('market_holdings').select('*').eq('user_id', userId).order('acquired_at', { ascending: true }),
    supabase.from('market_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('market_watchlist').select('player_id').eq('user_id', userId),
  ])

  const error = portfolioError ?? holdingsError ?? transactionsError ?? watchlistError

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
