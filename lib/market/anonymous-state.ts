import { MARKET_CREDITS_STARTING_BALANCE, MARKET_MAX_PORTFOLIO_SIZE, toUtcDateKey } from '@/lib/market/format'
import { countFormation } from '@/lib/market/formation'
import type {
  MarketAnonymousState,
  MarketHolding,
  MarketMatchweekApplyResult,
  MarketMatchweekRun,
  MarketPlayer,
  MarketPortfolio,
  MarketRevealSummary,
  MarketTransaction,
} from '@/lib/market/types'

const STORAGE_KEY = 'fiq-market-anon-v1'

function nowIso() {
  return new Date().toISOString()
}

function nextTxId(state: MarketAnonymousState) {
  const lastId = state.transactions.reduce((max, row) => (row.id > max ? row.id : max), 0)
  return lastId + 1
}

function nextHoldingId(state: MarketAnonymousState) {
  const lastId = state.holdings.reduce((max, row) => (row.id > max ? row.id : max), 0)
  return lastId + 1
}

export function createDefaultAnonymousState(): MarketAnonymousState {
  return {
    version: 1,
    cash: MARKET_CREDITS_STARTING_BALANCE,
    watchlist: [],
    holdings: [],
    transactions: [],
    runs: [],
    reveals: [],
    player_overrides: {},
    last_updated_at: nowIso(),
  }
}

function safeStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readAnonymousState() {
  const storage = safeStorage()
  if (!storage) return createDefaultAnonymousState()

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return createDefaultAnonymousState()

  try {
    const parsed = JSON.parse(raw) as Partial<MarketAnonymousState>
    if (!parsed || parsed.version !== 1) return createDefaultAnonymousState()
    return {
      ...createDefaultAnonymousState(),
      ...parsed,
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist.filter((id) => Number.isFinite(id)) : [],
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      reveals: Array.isArray(parsed.reveals) ? parsed.reveals : [],
      player_overrides: parsed.player_overrides ?? {},
    }
  } catch {
    return createDefaultAnonymousState()
  }
}

export function writeAnonymousState(state: MarketAnonymousState) {
  const storage = safeStorage()
  if (!storage) return
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, last_updated_at: nowIso() }))
}

export function applyAnonymousOverrides(players: MarketPlayer[], state: MarketAnonymousState) {
  return players.map((player) => {
    const override = state.player_overrides[String(player.id)]
    if (!override) return player
    return {
      ...player,
      previous_value: override.previous_value,
      current_value: override.current_value,
      value_updated_at: override.updated_at,
      updated_at: override.updated_at,
    }
  })
}

export function buildAnonymousPortfolio(players: MarketPlayer[], state: MarketAnonymousState) {
  const playersById = new Map(players.map((player) => [player.id, player]))
  const holdings = state.holdings.map((holding) => {
    const player = playersById.get(holding.player_id)
    const current = player?.current_value ?? holding.current_value_snapshot
    const unrealized = current - holding.acquisition_value
    return {
      ...holding,
      current_value_snapshot: current,
      unrealized_profit_loss: unrealized,
      user_id: 'anon-user',
    } as MarketHolding
  })

  const invested = holdings.reduce((sum, row) => sum + row.current_value_snapshot, 0)
  const realized = state.transactions
    .filter((row) => row.transaction_type === 'sell')
    .reduce((sum, row) => sum + (row.realized_profit_loss ?? 0), 0)
  const total = state.cash + invested

  const portfolio: MarketPortfolio = {
    user_id: 'anon-user',
    available_balance: state.cash,
    starting_balance: MARKET_CREDITS_STARTING_BALANCE,
    portfolio_value: invested,
    total_account_value: total,
    realized_profit_loss: realized,
    created_at: state.last_updated_at,
    updated_at: state.last_updated_at,
  }

  const transactions: MarketTransaction[] = state.transactions.map((row) => ({
    id: row.id,
    transaction_id: row.transaction_id,
    user_id: 'anon-user',
    player_id: row.player_id,
    transaction_type: row.transaction_type,
    execution_value: row.execution_value,
    balance_before: row.balance_before,
    balance_after: row.balance_after,
    created_at: row.created_at,
    trade_date_utc: row.trade_date_utc,
    idempotency_key: row.idempotency_key,
  }))

  return {
    portfolio,
    holdings,
    transactions,
    watchlist: state.watchlist,
  }
}

function ensureCanBuy(players: MarketPlayer[], state: MarketAnonymousState, player: MarketPlayer) {
  if (!player.active) return 'Player is currently unavailable for purchase.'
  if (state.holdings.some((holding) => holding.player_id === player.id)) return 'You already hold this player.'
  if (state.cash < player.current_value) return 'Insufficient cash for this purchase.'
  if (state.holdings.length >= MARKET_MAX_PORTFOLIO_SIZE) return 'Portfolio is already complete.'

  const playersById = new Map(players.map((row) => [row.id, row]))
  const formation = countFormation(
    state.holdings.map((row) => ({ ...row, user_id: 'anon-user' })) as MarketHolding[],
    playersById,
  )

  if (player.position === 'GK' && formation.GK >= 1) return 'Goalkeeper allocation is already complete (1/1).'
  if (player.position === 'DEF' && formation.DEF >= 4) return 'Defender allocation is already complete (4/4).'
  if (player.position === 'MID' && formation.MID >= 3) return 'Midfielder allocation is already complete (3/3).'
  if (player.position === 'FWD' && formation.FWD >= 3) return 'Forward allocation is already complete (3/3).'

  return null
}

function currentWeekNumber(state: MarketAnonymousState) {
  return (state.runs[0]?.week_number ?? 0) + 1
}

export function anonymousBuyPlayer(players: MarketPlayer[], slug: string, idempotencyKey: string) {
  const state = readAnonymousState()
  const player = players.find((row) => row.slug === slug)
  if (!player) return { data: null, error: new Error('Player not found') }

  const validationError = ensureCanBuy(players, state, player)
  if (validationError) return { data: null, error: new Error(validationError) }

  const before = state.cash
  const after = before - player.current_value
  const week = currentWeekNumber(state)

  state.holdings.push({
    id: nextHoldingId(state),
    player_id: player.id,
    acquisition_value: player.current_value,
    acquired_at: nowIso(),
    current_value_snapshot: player.current_value,
    unrealized_profit_loss: 0,
    acquired_week: week,
  })

  state.transactions.unshift({
    id: nextTxId(state),
    transaction_id: `anon-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    player_id: player.id,
    transaction_type: 'buy',
    execution_value: player.current_value,
    balance_before: before,
    balance_after: after,
    created_at: nowIso(),
    trade_date_utc: toUtcDateKey(),
    idempotency_key: idempotencyKey,
    matchweek: week,
    realized_profit_loss: null,
  })

  state.cash = after
  state.last_updated_at = nowIso()
  writeAnonymousState(state)

  return {
    data: {
      ok: true,
      duplicate: false,
      message: 'Purchase completed',
      player_slug: slug,
      execution_value: player.current_value,
      max_portfolio_size: MARKET_MAX_PORTFOLIO_SIZE,
    },
    error: null,
  }
}

export function anonymousSellPlayer(players: MarketPlayer[], slug: string, idempotencyKey: string) {
  const state = readAnonymousState()
  const player = players.find((row) => row.slug === slug)
  if (!player) return { data: null, error: new Error('Player not found') }

  const holdingIndex = state.holdings.findIndex((holding) => holding.player_id === player.id)
  if (holdingIndex === -1) return { data: null, error: new Error('You do not hold this player.') }

  const holding = state.holdings[holdingIndex]
  const before = state.cash
  const after = before + player.current_value
  const realized = player.current_value - holding.acquisition_value
  const week = currentWeekNumber(state)

  state.holdings.splice(holdingIndex, 1)
  state.transactions.unshift({
    id: nextTxId(state),
    transaction_id: `anon-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    player_id: player.id,
    transaction_type: 'sell',
    execution_value: player.current_value,
    balance_before: before,
    balance_after: after,
    created_at: nowIso(),
    trade_date_utc: toUtcDateKey(),
    idempotency_key: idempotencyKey,
    matchweek: week,
    realized_profit_loss: realized,
  })

  state.cash = after
  state.last_updated_at = nowIso()
  writeAnonymousState(state)

  return {
    data: {
      ok: true,
      duplicate: false,
      message: 'Sale completed',
      player_slug: slug,
      execution_value: player.current_value,
      realized_profit_loss: realized,
    },
    error: null,
  }
}

export function anonymousToggleWatchlist(playerSlug: string, players: MarketPlayer[]) {
  const player = players.find((row) => row.slug === playerSlug)
  if (!player) return { data: null, error: new Error('Player not found') }

  const state = readAnonymousState()
  const set = new Set(state.watchlist)
  if (set.has(player.id)) set.delete(player.id)
  else set.add(player.id)
  state.watchlist = [...set]
  state.last_updated_at = nowIso()
  writeAnonymousState(state)

  return {
    data: { watchlisted: set.has(player.id) },
    error: null,
  }
}

export function anonymousApplySimulatedMatchweek(
  players: MarketPlayer[],
  weekLabel: string,
  playerUpdates: Array<Record<string, unknown>>,
  reveal?: MarketRevealSummary,
) {
  const state = readAnonymousState()

  const playersById = new Map(players.map((row) => [row.id, row]))
  const holdingsView = state.holdings.map((row) => ({ ...row, user_id: 'anon-user' })) as MarketHolding[]
  const formation = countFormation(holdingsView, playersById)
  const isValid = state.holdings.length === MARKET_MAX_PORTFOLIO_SIZE
    && formation.GK === 1
    && formation.DEF === 4
    && formation.MID === 3
    && formation.FWD === 3

  if (!isValid) {
    return { data: null, error: new Error('Complete a valid 1-4-3-3 portfolio before simulating.') }
  }

  const weekNumber = currentWeekNumber(state)
  const duplicate = state.runs.some((run) => run.week_label === weekLabel)
  if (duplicate) {
    return { data: null, error: new Error('This matchweek was already simulated.') }
  }

  const beforeValue = state.cash + state.holdings.reduce((sum, row) => sum + row.current_value_snapshot, 0)
  const nextOverrides = { ...state.player_overrides }

  let winnerId: number | null = null
  let winnerDelta = Number.NEGATIVE_INFINITY
  let loserId: number | null = null
  let loserDelta = Number.POSITIVE_INFINITY

  for (const update of playerUpdates) {
    const playerId = Number(update.player_id)
    const nextValue = Number(update.new_value)
    if (!Number.isFinite(playerId) || !Number.isFinite(nextValue)) continue
    const player = playersById.get(playerId)
    if (!player) continue

    const previous = nextOverrides[String(playerId)]?.current_value ?? player.current_value
    const delta = nextValue - previous
    nextOverrides[String(playerId)] = {
      previous_value: previous,
      current_value: nextValue,
      updated_at: nowIso(),
    }

    if (delta > winnerDelta) {
      winnerDelta = delta
      winnerId = playerId
    }
    if (delta < loserDelta) {
      loserDelta = delta
      loserId = playerId
    }
  }

  state.player_overrides = nextOverrides
  const mergedPlayers = applyAnonymousOverrides(players, state)
  const mergedById = new Map(mergedPlayers.map((row) => [row.id, row]))

  for (const holding of state.holdings) {
    const latest = mergedById.get(holding.player_id)
    if (!latest) continue
    holding.current_value_snapshot = latest.current_value
    holding.unrealized_profit_loss = latest.current_value - holding.acquisition_value
  }

  const afterValue = state.cash + state.holdings.reduce((sum, row) => sum + row.current_value_snapshot, 0)
  const weeklyGain = afterValue - beforeValue
  const totalProfit = afterValue - MARKET_CREDITS_STARTING_BALANCE
  const roi = (totalProfit / MARKET_CREDITS_STARTING_BALANCE) * 100

  const run: MarketMatchweekRun = {
    id: (state.runs[0]?.id ?? 0) + 1,
    initiated_by: 'anon-user',
    week_number: weekNumber,
    week_label: weekLabel,
    processed_players: playerUpdates.length,
    biggest_winner_player_id: winnerId,
    biggest_winner_delta: Number.isFinite(winnerDelta) ? winnerDelta : 0,
    biggest_loser_player_id: loserId,
    biggest_loser_delta: Number.isFinite(loserDelta) ? loserDelta : 0,
    weekly_portfolio_gain: weeklyGain,
    current_roi_pct: Number(roi.toFixed(3)),
    total_profit_since_start: totalProfit,
    created_at: nowIso(),
  }

  state.runs.unshift(run)
  if (reveal) state.reveals.unshift(reveal)
  state.last_updated_at = nowIso()
  writeAnonymousState(state)

  const result: MarketMatchweekApplyResult = {
    ok: true,
    week_number: weekNumber,
    week_label: weekLabel,
    processed_players: playerUpdates.length,
    biggest_winner: {
      player_id: winnerId,
      player_name: winnerId ? mergedById.get(winnerId)?.display_name ?? null : null,
      delta: Number.isFinite(winnerDelta) ? winnerDelta : 0,
    },
    biggest_loser: {
      player_id: loserId,
      player_name: loserId ? mergedById.get(loserId)?.display_name ?? null : null,
      delta: Number.isFinite(loserDelta) ? loserDelta : 0,
    },
    weekly_portfolio_gain: weeklyGain,
    current_roi_pct: Number(roi.toFixed(3)),
    total_profit_since_start: totalProfit,
    portfolio_before: beforeValue,
    portfolio_after: afterValue,
  }

  return { data: result, error: null }
}

export function anonymousLatestRun() {
  const state = readAnonymousState()
  return state.runs[0] ?? null
}

export function anonymousRuns(limit = 12) {
  const state = readAnonymousState()
  return state.runs.slice(0, limit)
}

export function anonymousLatestReveal() {
  const state = readAnonymousState()
  return state.reveals[0] ?? null
}

export function anonymousReveals(limit = 12) {
  const state = readAnonymousState()
  return state.reveals.slice(0, limit)
}
