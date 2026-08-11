import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { calculatePerformanceValueUpdate } from '@/lib/market/real-valuation'
import type { MarketPlayer } from '@/lib/market/types'

type PreviewRow = {
  app_player_id: number
  previous_value_minor: number
  current_value_minor: number
  rating: number
  minutes_played: number
  experiment_label: string
  applied_at: string
}

const CONTROLLED_PERFORMANCES = new Map<number, { previousValue: number; rating: number; minutes: number }>([
  [129820, { previousValue: 5_200_000, rating: 7.8, minutes: 90 }],
  [31837, { previousValue: 5_900_000, rating: 6.2, minutes: 90 }],
  [96208, { previousValue: 5_900_000, rating: 6.7, minutes: 90 }],
  [1743, { previousValue: 5_500_000, rating: 7.5, minutes: 90 }],
  [17544737, { previousValue: 7_000_000, rating: 8.1, minutes: 90 }],
  [37255840, { previousValue: 7_800_000, rating: 8.4, minutes: 90 }],
  [186910, { previousValue: 7_100_000, rating: 7.2, minutes: 90 }],
  [4545430, { previousValue: 7_600_000, rating: 6.1, minutes: 90 }],
  [37317015, { previousValue: 8_200_000, rating: 7.7, minutes: 90 }],
  [154421, { previousValue: 8_000_000, rating: 6.0, minutes: 90 }],
  [96611, { previousValue: 8_000_000, rating: 7.0, minutes: 90 }],
])

function controlledRows(players: MarketPlayer[]): PreviewRow[] {
  const appliedAt = new Date().toISOString()
  return players.flatMap((player) => {
    const performance = CONTROLLED_PERFORMANCES.get(player.id)
    if (!performance) return []
    const result = calculatePerformanceValueUpdate({
      position: player.position,
      currentValue: performance.previousValue,
      rollingWeekMovement: 0,
      performances: [{
        providerAppearanceId: `preview-${player.id}`,
        providerFixtureId: 'preview-engine-proof',
        providerPlayerId: String(player.id),
        minutesPlayed: performance.minutes,
        rating: performance.rating,
        appeared: true,
        verificationStatus: 'verified',
        sourceName: 'Verdict XI controlled preview',
        sourceReference: 'preview-engine-proof',
        retrievedAt: appliedAt,
        idempotencyKey: `preview-engine-proof:${player.id}`,
        eligibleForValuation: true,
        matchDate: appliedAt,
        gameweek: null,
      }],
    })
    if (!result) return []
    return [{
      app_player_id: player.id,
      previous_value_minor: result.previousValue,
      current_value_minor: result.newValue,
      rating: performance.rating,
      minutes_played: performance.minutes,
      experiment_label: '11-player engine proof',
      applied_at: appliedAt,
    }]
  })
}

export async function applyPreviewValueExperiment(players: MarketPlayer[]) {
  if (process.env.VERCEL_ENV !== 'preview') return { players, active: false }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let experimentRows = controlledRows(players)
  if (url?.trim() && key?.trim()) {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data } = await admin.from('market_preview_value_experiments')
      .select('app_player_id,previous_value_minor,current_value_minor,rating,minutes_played,experiment_label,applied_at')
      .eq('active', true)
    if (data?.length) experimentRows = data as PreviewRow[]
  }

  const rows = new Map(experimentRows.map((row) => [Number(row.app_player_id), row]))
  return {
    active: true,
    players: players.map((player) => {
      const row = rows.get(player.id)
      if (!row) return player
      const delta = row.current_value_minor - row.previous_value_minor
      return {
        ...player,
        previous_value: row.previous_value_minor,
        current_value: row.current_value_minor,
        value_updated_at: row.applied_at,
        updated_at: row.applied_at,
        data_source_label: 'Verdict XI preview valuation experiment',
        is_trade_locked: true,
        trade_lock_reason: 'Controlled preview valuation evidence cannot be traded as a real completed fixture',
        trade_lock_started_at: row.applied_at,
        trade_lock_ends_at: null,
        value_trend: delta > 0 ? 'rising' as const : delta < 0 ? 'falling' as const : 'flat' as const,
        recent_form_indicator: row.rating >= 7.4 ? 'hot' as const : row.rating < 6.5 ? 'cool' as const : 'steady' as const,
        decision_support_note: `${row.experiment_label}: controlled ${row.rating.toFixed(1)} rating over ${row.minutes_played} minutes.`,
        matchweek_performance_history: [{ week: 0, rating: Number(row.rating), minutes: row.minutes_played }],
      }
    }),
  }
}
