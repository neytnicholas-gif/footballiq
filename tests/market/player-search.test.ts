import { describe, expect, it } from 'vitest'
import { matchesPlayerSearch, normalizePlayerSearch, scorePlayerSearch } from '@/lib/market/player-search'

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

  it('accepts a small spelling mistake in a longer player name', () => {
    expect(matchesPlayerSearch({ ...player, display_name: 'Erling Haaland' }, 'Haland')).toBe(true)
    expect(matchesPlayerSearch(player, 'Mpaypal')).toBe(false)
  })

  it('supports combined player and club searches', () => {
    expect(matchesPlayerSearch(player, 'mbappe madrid')).toBe(true)
    expect(matchesPlayerSearch(player, 'mbappe barcelona')).toBe(false)
  })

  it('ranks a name match above a club match', () => {
    const nameMatch = scorePlayerSearch(player, 'Kylian')
    const clubMatch = scorePlayerSearch({ ...player, display_name: 'Jude Bellingham', short_name: 'J. Bellingham', club_name: 'Kylian FC' }, 'Kylian')
    expect(nameMatch).toBeGreaterThan(clubMatch)
  })

  it('normalizes punctuation and repeated spaces', () => {
    expect(normalizePlayerSearch("  Nico O’Reilly  ")).toBe('nico o reilly')
  })
})
