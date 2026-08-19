import { describe, expect, it } from 'vitest'
import { matchesPlayerSearch, normalizePlayerSearch } from '@/lib/market/player-search'

const player = {
  display_name: 'Kylian Mbappé',
  short_name: 'K. Mbappé',
  club_name: 'Real Madrid',
}

describe('market player search', () => {
  it('matches a player by full or partial name', () => {
    expect(matchesPlayerSearch(player, 'Kylian')).toBe(true)
    expect(matchesPlayerSearch(player, 'mbapp')).toBe(true)
  })

  it('matches names typed without accents', () => {
    expect(normalizePlayerSearch('Mbappé')).toBe('mbappe')
    expect(matchesPlayerSearch(player, 'mbappe')).toBe(true)
  })

  it('also supports club searches and rejects unrelated terms', () => {
    expect(matchesPlayerSearch(player, 'real madrid')).toBe(true)
    expect(matchesPlayerSearch(player, 'Barcelona')).toBe(false)
  })
})
