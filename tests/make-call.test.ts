import { describe, expect, it } from 'vitest'
import {
  assignMakeCallPlayer,
  assignmentIsComplete,
  exactPercentageDistribution,
  makeCallPercentages,
  makeCallShareText,
  makeCallVerdict,
  type MakeCallPlayer,
} from '@/lib/make-call'

const players: MakeCallPlayer[] = [
  { id: 'a', stable_player_id: 'a', display_name: 'Alpha One', short_name: 'Alpha', club_name: 'A FC', position_label: 'Forward', initials: 'AO', accent_from: '#000000', accent_to: '#ffffff' },
  { id: 'b', stable_player_id: 'b', display_name: 'Bravo Two', short_name: 'Bravo', club_name: 'B FC', position_label: 'Forward', initials: 'BT', accent_from: '#000000', accent_to: '#ffffff' },
  { id: 'c', stable_player_id: 'c', display_name: 'Charlie Three', short_name: 'Charlie', club_name: 'C FC', position_label: 'Forward', initials: 'CT', accent_from: '#000000', accent_to: '#ffffff' },
]

describe('Make the Call game rules', () => {
  it('requires one different player for each action', () => {
    expect(assignmentIsComplete({ start: 'a', bench: 'b' })).toBe(false)
    expect(assignmentIsComplete({ start: 'a', bench: 'a', sell: 'c' })).toBe(false)
    expect(assignmentIsComplete({ start: 'a', bench: 'b', sell: 'c' })).toBe(true)
  })

  it('swaps occupied actions instead of creating duplicate assignments', () => {
    const swapped = assignMakeCallPlayer({ start: 'a', bench: 'b', sell: 'c' }, 'start', 'b')
    expect(swapped).toEqual({ start: 'b', bench: 'a', sell: 'c' })
    expect(assignmentIsComplete(swapped)).toBe(true)
  })

  it('rounds every distribution to exactly 100 percent', () => {
    const percentages = exactPercentageDistribution({ a: 1, b: 1, c: 1 }, ['a', 'b', 'c'])
    expect(percentages).toEqual({ a: 34, b: 33, c: 33 })
    expect(Object.values(percentages).reduce((sum, value) => sum + value, 0)).toBe(100)
  })

  it('calculates action and exact-call percentages from real counts', () => {
    const value = makeCallPercentages({
      sample_size: 7,
      start_counts: { a: 4, b: 2, c: 1 },
      bench_counts: { a: 2, b: 3, c: 2 },
      sell_counts: { a: 1, b: 2, c: 4 },
      exact_count: 2,
    }, players)
    expect(value.start).toEqual({ a: 57, b: 29, c: 14 })
    expect(value.exact).toBe(29)
  })

  it('creates a playful verdict and a clean direct-link share message', () => {
    const results = { sample_size: 20, start_counts: { a: 4, b: 15, c: 1 }, bench_counts: { a: 15, b: 1, c: 4 }, sell_counts: { a: 1, b: 4, c: 15 }, exact_count: 8 }
    expect(makeCallVerdict({ assignments: { start: 'b', bench: 'a', sell: 'c' }, results, players }).title).toBe('The popular call')
    expect(makeCallShareText({ start: 'b', bench: 'a', sell: 'c' }, players, 'https://earlyshout.com/quizzes/start-bench-sell')).toBe('I’m starting Bravo, benching Alpha and selling Charlie. Make your call on Early Shout: https://earlyshout.com/quizzes/start-bench-sell')
  })
})
