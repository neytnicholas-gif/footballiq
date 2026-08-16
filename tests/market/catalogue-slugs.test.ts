import { describe, expect, it } from 'vitest'
import { resolveCataloguePlayerSlugs } from '@/lib/market/catalogue-slugs'

describe('catalogue player slug reconciliation', () => {
  it('preserves published slugs when provider ordering changes', () => {
    const resolved = resolveCataloguePlayerSlugs('season-current', [
      { providerPlayerId: '20', candidateSlug: 'alex-example' },
      { providerPlayerId: '10', candidateSlug: 'alex-example-10' },
    ], [
      { providerPlayerId: '10', seasonId: 'season-current', slug: 'alex-example' },
      { providerPlayerId: '20', seasonId: 'season-current', slug: 'alex-example-20' },
    ])

    expect(resolved.get('10')).toBe('alex-example')
    expect(resolved.get('20')).toBe('alex-example-20')
  })

  it('gives a newcomer a deterministic suffix when its preferred slug is owned', () => {
    const resolved = resolveCataloguePlayerSlugs('season-current', [
      { providerPlayerId: '42', candidateSlug: 'sam-player' },
    ], [
      { providerPlayerId: '7', seasonId: 'season-current', slug: 'sam-player' },
    ])

    expect(resolved.get('42')).toBe('sam-player-42')
  })

  it('moves a player between seasons without colliding with a current slug', () => {
    const resolved = resolveCataloguePlayerSlugs('season-current', [
      { providerPlayerId: '42', candidateSlug: 'sam-player' },
    ], [
      { providerPlayerId: '7', seasonId: 'season-current', slug: 'sam-player' },
      { providerPlayerId: '42', seasonId: 'season-previous', slug: 'sam-player' },
    ])

    expect(resolved.get('42')).toBe('sam-player-42')
  })

  it('is deterministic for new duplicate candidates regardless of input order', () => {
    const forward = resolveCataloguePlayerSlugs('season-current', [
      { providerPlayerId: '20', candidateSlug: 'same-name' },
      { providerPlayerId: '10', candidateSlug: 'same-name' },
    ], [])
    const reverse = resolveCataloguePlayerSlugs('season-current', [
      { providerPlayerId: '10', candidateSlug: 'same-name' },
      { providerPlayerId: '20', candidateSlug: 'same-name' },
    ], [])

    expect([...forward.entries()]).toEqual([...reverse.entries()])
    expect(forward.get('10')).toBe('same-name')
    expect(forward.get('20')).toBe('same-name-20')
  })
})
