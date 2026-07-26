import type { MatchweekPlayerPatch } from '@/lib/market/simulation'
import type {
  MarketHolding,
  MarketMatchweekApplyResult,
  MarketPlayer,
  MarketPortfolio,
  MarketRevealHoldingMovement,
  MarketRevealSummary,
} from '@/lib/market/types'

function movementExplanation(rating: number, minutes: number, delta: number) {
  if (delta > 0 && rating >= 7.4) return 'Strong performance relative to positional baseline increased demand.'
  if (delta > 0 && minutes >= 85) return 'Secure minutes and steady output supported value growth.'
  if (delta < 0 && minutes < 60) return 'Limited minutes reduced short-term confidence in this holding.'
  if (delta < 0 && rating < 6.4) return 'Quiet performance and recent softness led to a value pullback.'
  return 'Stable output resulted in controlled value movement this week.'
}

export function createRevealSummary(input: {
  scopeKey: string
  result: MarketMatchweekApplyResult
  playersBefore: MarketPlayer[]
  playersAfter: MarketPlayer[]
  holdingsBefore: MarketHolding[]
  holdingsAfter: MarketHolding[]
  patches: MatchweekPlayerPatch[]
  portfolioAfter: MarketPortfolio | null
}): MarketRevealSummary {
  const beforeById = new Map(input.playersBefore.map((player) => [player.id, player]))
  const afterById = new Map(input.playersAfter.map((player) => [player.id, player]))
  const patchByPlayerId = new Map(input.patches.map((patch) => [patch.player_id, patch]))

  const holdingRows: MarketRevealHoldingMovement[] = input.holdingsAfter
    .map((holding) => {
      const before = beforeById.get(holding.player_id)
      const after = afterById.get(holding.player_id)
      if (!before || !after) return null
      const patch = patchByPlayerId.get(holding.player_id)
      const delta = after.current_value - before.current_value
      const returnPct = holding.acquisition_value > 0 ? ((after.current_value - holding.acquisition_value) / holding.acquisition_value) * 100 : 0
      return {
        player_id: after.id,
        player_name: after.display_name,
        position: after.position,
        purchase_price: holding.acquisition_value,
        previous_value: before.current_value,
        current_value: after.current_value,
        delta,
        return_pct: Number(returnPct.toFixed(2)),
        explanation: movementExplanation(patch?.rating ?? 6.9, patch?.minutes_played ?? 90, delta),
      }
    })
    .filter((row): row is MarketRevealHoldingMovement => row !== null)
    .sort((a, b) => b.delta - a.delta)

  const bestHeld = holdingRows[0] ?? null
  const weakestHeld = holdingRows.length > 0 ? [...holdingRows].sort((a, b) => a.delta - b.delta)[0] : null

  const previousPortfolioValue = input.result.portfolio_before
  const newPortfolioValue = input.result.portfolio_after
  const weeklyChange = input.result.weekly_portfolio_gain
  const weeklyReturnPct = previousPortfolioValue > 0 ? (weeklyChange / previousPortfolioValue) * 100 : 0

  return {
    scope_key: input.scopeKey,
    week_number: input.result.week_number,
    week_label: input.result.week_label,
    completed_at: new Date().toISOString(),
    previous_portfolio_value: previousPortfolioValue,
    new_portfolio_value: newPortfolioValue,
    weekly_change: weeklyChange,
    weekly_return_pct: Number(weeklyReturnPct.toFixed(2)),
    biggest_winner: {
      player_id: input.result.biggest_winner.player_id,
      player_name: input.result.biggest_winner.player_name,
      delta: input.result.biggest_winner.delta,
    },
    biggest_loser: {
      player_id: input.result.biggest_loser.player_id,
      player_name: input.result.biggest_loser.player_name,
      delta: input.result.biggest_loser.delta,
    },
    best_held_player: {
      player_id: bestHeld?.player_id ?? null,
      player_name: bestHeld?.player_name ?? null,
      delta: bestHeld?.delta ?? 0,
    },
    weakest_held_player: {
      player_id: weakestHeld?.player_id ?? null,
      player_name: weakestHeld?.player_name ?? null,
      delta: weakestHeld?.delta ?? 0,
    },
    cash_after: input.portfolioAfter?.available_balance ?? 0,
    invested_after: input.portfolioAfter?.portfolio_value ?? 0,
    total_after: input.portfolioAfter?.total_account_value ?? newPortfolioValue,
    holdings: holdingRows,
  }
}

function revealStorageKey(scopeKey: string) {
  return `fiq-market-reveal-v1:${scopeKey}`
}

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function saveRevealSummary(scopeKey: string, reveal: MarketRevealSummary) {
  const storage = getStorage()
  if (!storage) return
  const key = revealStorageKey(scopeKey)
  const existingRaw = storage.getItem(key)
  let existing: MarketRevealSummary[] = []
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw)
      if (Array.isArray(parsed)) existing = parsed as MarketRevealSummary[]
    } catch {
      existing = []
    }
  }
  const deduped = [reveal, ...existing.filter((row) => row.week_number !== reveal.week_number)]
  storage.setItem(key, JSON.stringify(deduped.slice(0, 20)))
}

export function loadRevealHistory(scopeKey: string, limit = 12) {
  const storage = getStorage()
  if (!storage) return []
  const raw = storage.getItem(revealStorageKey(scopeKey))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as MarketRevealSummary[]).slice(0, limit)
  } catch {
    return []
  }
}

export function loadLatestReveal(scopeKey: string) {
  return loadRevealHistory(scopeKey, 1)[0] ?? null
}
