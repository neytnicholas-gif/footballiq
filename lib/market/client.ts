import { supabase } from '@/lib/supabase'
import {
  createMarketRequestKey,
  MARKET_WEEKLY_SIGNING_LIMIT,
  toUtcIsoWeekKey,
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
import { loadLatestReveal, loadRevealHistory } from '@/lib/market/reveal'
import type {
  MarketFriendLeague,
  MarketFriendLeagueLeaderboardRow,
  MarketFriendLeagueMember,
  MarketGameweekStatus,
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

function isPermissionDenied(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const row = error as { code?: string; message?: string }
  return row.code === '42501' || /permission denied/i.test(row.message ?? '')
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

let verifiedCatalogueRequest: Promise<MarketPlayer[]> | null = null

function fetchVerifiedMarketPlayers() {
  if (!verifiedCatalogueRequest) {
    verifiedCatalogueRequest = fetch('/api/market/catalogue')
      .then(async (response) => {
        if (!response.ok) throw new Error('The verified player catalogue request failed.')
        const payload = await response.json() as { players?: MarketPlayer[] }
        if (!Array.isArray(payload.players) || payload.players.length === 0) {
          throw new Error('The verified player catalogue is empty.')
        }
        return payload.players
      })
      .catch((error) => {
        verifiedCatalogueRequest = null
        throw error
      })
  }
  return verifiedCatalogueRequest
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
  const [authResult, catalogueResult] = await Promise.allSettled([
    supabase.auth.getUser(),
    fetchVerifiedMarketPlayers(),
  ])
  const authData = authResult.status === 'fulfilled' ? authResult.value.data : { user: null }
  const user = authData.user

  // The verified provider catalogue is the canonical app-shaped read model.
  // Account-backed trades resolve its stable slug to the normalized UUID row
  // inside the database, so provider IDs never become trusted write inputs.
  if (catalogueResult.status === 'rejected') {
    return {
      data: [] as MarketPlayer[],
      error: new Error('Live verified player data is temporarily unavailable. No demo players are being shown.'),
    }
  }

  let rows = catalogueResult.value

  if (!user) {
    const anonState = readAnonymousState()
    rows = applyAnonymousOverrides(rows, anonState)
  }

  return {
    data: rows,
    error: null as Error | null,
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
  const { data: playerRow, error: playerError } = await supabase
    .from('market_players')
    .select('id')
    // The checked-in generated types predate the normalized provider schema deployed to staging.
    // @ts-expect-error app_player_id exists in the verified staging schema.
    .eq('app_player_id', playerId)
    .maybeSingle()

  if (playerError || !playerRow) {
    return {
      data: [],
      error: isMarketBackendUnavailable(playerError) || isPermissionDenied(playerError) ? null : playerError as Error | null,
    }
  }

  const { data, error } = await supabase
    .from('player_season_stats')
    .select('player_id,season_id,appearances,starts,minutes_played,goals,assists,clean_sheets,yellow_cards,red_cards,average_rating_milli,source_through_at,updated_at')
    .eq('player_id', playerRow.id)
    .order('season_id', { ascending: false })

  return {
    data: mapNormalizedSeasonStats(data, playerId),
    error: isMarketBackendUnavailable(error) ? null : error as Error | null,
  }
}

export async function loadMarketSeasonStats() {
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('player_id,season_id,appearances,starts,minutes_played,goals,assists,clean_sheets,yellow_cards,red_cards,average_rating_milli,source_through_at,updated_at')
    .order('season_id', { ascending: false })

  return {
    data: mapNormalizedSeasonStats(data),
    error: isMarketBackendUnavailable(error) || isPermissionDenied(error) ? null : error as Error | null,
  }
}

type NormalizedSeasonStatRow = {
  player_id: string
  season_id: string
  appearances: number
  starts: number
  minutes_played: number
  goals: number
  assists: number
  clean_sheets: number
  yellow_cards: number
  red_cards: number
  average_rating_milli: number | null
  source_through_at: string | null
  updated_at: string
}

function mapNormalizedSeasonStats(data: unknown, appPlayerId?: number): MarketSeasonStats[] {
  if (!Array.isArray(data)) return []
  return (data as NormalizedSeasonStatRow[]).map((row, index) => ({
    id: index + 1,
    player_id: appPlayerId ?? 0,
    season: row.season_id.replace(/^sportmonks-/, ''),
    competition_label: row.season_id,
    appearances: row.appearances,
    starts: row.starts,
    minutes: row.minutes_played,
    goals: row.goals,
    assists: row.assists,
    clean_sheets: row.clean_sheets,
    yellow_cards: row.yellow_cards,
    red_cards: row.red_cards,
    shots: null,
    shots_on_target: null,
    chances_created: null,
    key_passes: null,
    passes_completed: null,
    pass_accuracy: null,
    tackles: null,
    interceptions: null,
    clearances: null,
    blocks: null,
    saves: null,
    goals_conceded: null,
    expected_goals: null,
    expected_assists: null,
    average_rating: row.average_rating_milli === null ? null : row.average_rating_milli / 1000,
    data_source: 'Sportmonks Football API',
    source_reference: null,
    provenance_status: 'verified',
    owner_verified: true,
    last_verified_at: row.source_through_at,
    created_at: row.updated_at,
    updated_at: row.updated_at,
  }))
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

  const { data: snapshotData, error: snapshotError } = await supabase.rpc('market_app_portfolio_snapshot', {})
  if (!snapshotError) {
    const snapshot = (snapshotData as {
      portfolio?: MarketPortfolio | null
      holdings?: MarketHolding[]
      transactions?: MarketTransaction[]
      watchlist?: number[]
    } | null) ?? null

    return {
      error: null,
      portfolio: snapshot?.portfolio ?? null,
      holdings: snapshot?.holdings ?? [],
      transactions: snapshot?.transactions ?? [],
      watchlist: snapshot?.watchlist ?? [],
    }
  }

  if (!isMarketBackendUnavailable(snapshotError)) {
    return { error: snapshotError as Error, portfolio: null, holdings: [], transactions: [], watchlist: [] as number[] }
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

  if (!error) {
    return {
      data: (data as MarketLeaderboardRow[] | null) ?? [],
      error: null,
    }
  }

  // Staging originally shipped the playable-loop leaderboard contract. PostgREST
  // reports missing selected columns in more than one message format, so always
  // try the compatible projection before treating the leaderboard as unavailable.
  const legacyResult = await supabase
    .from('market_public_leaderboard')
    .select('portfolio_id, display_name, total_wealth_minor, total_profit_minor, weekly_change_minor, return_basis_points')
    .order('total_wealth_minor', { ascending: false })
    .limit(100)

  if (!legacyResult.error) {
    const legacyRows = (legacyResult.data ?? []) as unknown as Array<{
      portfolio_id: string
      display_name: string
      total_wealth_minor: number
      total_profit_minor: number
      weekly_change_minor: number
      return_basis_points: number
    }>

    return {
      data: legacyRows.map((row) => ({
        user_id: row.portfolio_id,
        username: row.display_name,
        total_account_value: Number(row.total_wealth_minor) || 0,
        all_time_gain: Number(row.total_profit_minor) || 0,
        daily_gain: 0,
        weekly_gain: Number(row.weekly_change_minor) || 0,
        monthly_gain: 0,
        season_gain: 0,
        daily_return_pct: 0,
        weekly_return_pct: (Number(row.return_basis_points) || 0) / 100,
        monthly_return_pct: 0,
        season_return_pct: 0,
        all_time_return_pct: (Number(row.return_basis_points) || 0) / 100,
      })),
      error: null,
    }
  }

  return {
    data: [],
    error: legacyResult.error as Error,
  }
}

export function calculateTradesRemaining(transactions: MarketTransaction[]) {
  const currentWeek = toUtcIsoWeekKey()
  const currentWeekTransactions = transactions.filter((transaction) => toUtcIsoWeekKey(new Date(transaction.created_at)) === currentWeek)
  const buysUsed = currentWeekTransactions.filter((transaction) => transaction.transaction_type === 'buy').length
  const salesUsed = currentWeekTransactions.filter((transaction) => transaction.transaction_type === 'sell').length

  return {
    buysRemaining: Math.max(0, MARKET_WEEKLY_SIGNING_LIMIT - buysUsed),
    salesRemaining: Number.MAX_SAFE_INTEGER,
    buysUsed,
    salesUsed,
  }
}

export async function loadMyGameweekStatus(): Promise<{ data: MarketGameweekStatus | null; error: Error | null }> {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return { data: null, error: null }
  const { data, error } = await (supabase as any).rpc('market_my_gameweek_status', {})
  if (isMarketBackendUnavailable(error)) return { data: null, error: null }
  return { data: (data as MarketGameweekStatus | null) ?? null, error: error as Error | null }
}

export async function buyMarketPlayer(slug: string, playerId?: number, requestKey?: string) {
  const idempotencyKey = requestKey ?? createMarketRequestKey(`buy-${slug}`)

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousBuyPlayer(players, slug, idempotencyKey)
  }

  const { data, error } = await supabase.rpc('market_buy_player', {
    p_player_slug: playerId ? String(playerId) : slug,
    p_idempotency_key: idempotencyKey,
  })

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function sellMarketPlayer(slug: string, playerId?: number, requestKey?: string) {
  const idempotencyKey = requestKey ?? createMarketRequestKey(`sell-${slug}`)

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousSellPlayer(players, slug, idempotencyKey)
  }

  const { data, error } = await supabase.rpc('market_sell_player', {
    p_player_slug: playerId ? String(playerId) : slug,
    p_idempotency_key: idempotencyKey,
  })

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error as Error | null,
  }
}

export async function toggleMarketWatchlist(slug: string, playerId?: number) {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const { data: players } = await loadMarketPlayers()
    return anonymousToggleWatchlist(slug, players)
  }

  const { data, error } = await supabase.rpc('market_toggle_watchlist', {
    p_player_slug: playerId ? String(playerId) : slug,
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

  if (isMarketBackendUnavailable(error)) {
    return {
      data: null,
      error: null,
    }
  }

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

  if (isMarketBackendUnavailable(error)) {
    return {
      data: [],
      error: null,
    }
  }

  return {
    data: (data as MarketMatchweekRun[] | null) ?? [],
    error: error as Error | null,
  }
}

export async function loadMyRevealHistory(limit = 12): Promise<{ data: MarketRevealSummary[]; error: Error | null }> {
  const { data: authData } = await supabase.auth.getUser()
  const scopeKey = authData.user?.id ?? 'anon'
  if (authData.user) {
    const { data, error } = await (supabase as any).rpc('market_my_reveals', { p_limit: limit })
    if (!error && Array.isArray(data)) return { data: data as MarketRevealSummary[], error: null }
    if (error && !isMarketBackendUnavailable(error)) return { data: [], error: error as Error }
  }
  return {
    data: loadRevealHistory(scopeKey, limit),
    error: null,
  }
}

export async function loadMyLatestReveal(): Promise<{ data: MarketRevealSummary | null; error: Error | null }> {
  const result = await loadMyRevealHistory(1)
  return { data: result.data[0] ?? null, error: result.error }
}
