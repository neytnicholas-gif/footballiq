import { describe, expect, it } from 'vitest'
import { friendlyMarketLeagueError, friendlyMarketLoadError } from '@/lib/market/user-errors'

describe('market user-facing errors', () => {
  it('never exposes raw database load failures', () => {
    const message = friendlyMarketLoadError(new Error('permission denied for table market_portfolios'))
    expect(message).toBe('This part of the Market could not load. Your roster and budget were not changed. Please try again.')
    expect(message).not.toContain('permission denied')
  })

  it('turns friends-league failures into recoverable instructions', () => {
    expect(friendlyMarketLeagueError(new Error('LEAGUE_NAME_INVALID'), 'create'))
      .toBe('Use a league name between 3 and 40 characters.')
    expect(friendlyMarketLeagueError(new Error('League code not found'), 'join'))
      .toBe('That invite code does not match an open friends league.')
    expect(friendlyMarketLeagueError(new Error('LEAGUE_NOT_FOUND_OR_NOT_OWNER'), 'delete'))
      .toBe('Only the league owner can delete that league.')
  })
})
