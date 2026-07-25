import { supabase } from '@/lib/supabase'
import {
  createMarketRequestKey,
  MARKET_DAILY_BUY_LIMIT,
  MARKET_DAILY_SELL_LIMIT,
  toUtcDateKey,
} from '@/lib/market/format'
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
  MarketSeasonStats,
  MarketTransaction,
  MarketValueHistoryPoint,
} from '@/lib/market/types'

export async function refreshMyMarketPortfolio() {
  const { error } = await supabase.rpc('market_refresh_my_portfolio', {})
  return { error: error as Error | null }
}

export async function loadMarketPlayers() {
  const { data, error } = await supabase
    .from('market_players')
    .select('*')
    .eq('active', true)
    .order('current_value', { ascending: false })

  return {
    data: (data as MarketPlayer[] | null) ?? [],
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

  return {
    data: (data as MarketSeasonStats[] | null) ?? [],
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
  if (!authData.user) return { error: null, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }

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
