import { describe, expect, it } from 'vitest'
import { primaryNavigationLinkIsActive } from '@/lib/play-navigation'

describe('primary play navigation', () => {
  it('keeps the Games and Quizzes sections distinct', () => {
    expect(primaryNavigationLinkIsActive('/games', '/games')).toBe(true)
    expect(primaryNavigationLinkIsActive('/quizzes', '/games')).toBe(false)
    expect(primaryNavigationLinkIsActive('/quizzes', '/quizzes')).toBe(true)
    expect(primaryNavigationLinkIsActive('/quizzes/football-duels', '/games')).toBe(true)
    expect(primaryNavigationLinkIsActive('/quizzes/football-duels', '/quizzes')).toBe(false)
    expect(primaryNavigationLinkIsActive('/quizzes/tactical-lab', '/games')).toBe(false)
    expect(primaryNavigationLinkIsActive('/quizzes/tactical-lab', '/quizzes')).toBe(true)
  })

  it('matches nested destinations without making Home active everywhere', () => {
    expect(primaryNavigationLinkIsActive('/market/players', '/market')).toBe(true)
    expect(primaryNavigationLinkIsActive('/profile', '/profile')).toBe(true)
    expect(primaryNavigationLinkIsActive('/games', '/')).toBe(false)
  })
})
