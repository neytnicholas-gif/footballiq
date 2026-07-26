import { describe, expect, it } from 'vitest'
import { createRevealSummary } from '@/lib/market/reveal'
import { buildSampleMarketPlayers } from '@/lib/market/sample-data'

describe('reveal summary', () => {
  it('computes weekly movement and standings', () => {
    const before = buildSampleMarketPlayers()
    const after = before.map((player, index) => ({
      ...player,
      current_value: index === 0 ? player.current_value + 200_000 : player.current_value,
      previous_value: player.current_value,
    }))

    const summary = createRevealSummary({
      scopeKey: 'anon',
      result: {
        ok: true,
        week_number: 1,
        week_label: 'MW1',
        processed_players: 1,
        biggest_winner: {
          player_id: before[0].id,
          player_name: before[0].display_name,
          delta: 200_000,
        },
        biggest_loser: {
          player_id: before[1].id,
          player_name: before[1].display_name,
          delta: 0,
        },
        weekly_portfolio_gain: 200_000,
        current_roi_pct: 1.2,
        total_profit_since_start: 200_000,
        portfolio_before: 100_000_000,
        portfolio_after: 100_200_000,
      },
      playersBefore: before,
      playersAfter: after,
      holdingsBefore: [
        {
          id: 1,
          user_id: 'anon-user',
          player_id: before[0].id,
          acquisition_value: before[0].current_value,
          acquired_at: new Date().toISOString(),
          current_value_snapshot: before[0].current_value,
          unrealized_profit_loss: 0,
        },
      ],
      holdingsAfter: [
        {
          id: 1,
          user_id: 'anon-user',
          player_id: before[0].id,
          acquisition_value: before[0].current_value,
          acquired_at: new Date().toISOString(),
          current_value_snapshot: before[0].current_value + 200_000,
          unrealized_profit_loss: 200_000,
        },
      ],
      patches: [
        {
          player_id: before[0].id,
          rating: 8,
          minutes_played: 90,
          confidence_score: 0.9,
          new_value: before[0].current_value + 200_000,
        },
      ],
      portfolioAfter: {
        user_id: 'anon-user',
        available_balance: 25_000_000,
        starting_balance: 100_000_000,
        portfolio_value: 75_200_000,
        total_account_value: 100_200_000,
        realized_profit_loss: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    expect(summary.weekly_change).toBe(200_000)
    expect(summary.weekly_return_pct).toBe(0.2)
    expect(summary.holdings).toHaveLength(1)
    expect(summary.holdings[0].delta).toBe(200_000)
  })
})
