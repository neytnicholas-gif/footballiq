import { describe, expect, it } from 'vitest'
import { emptyPlayInterestProfile, playInterestForPath, strongestPlayInterest } from '@/lib/play-path'

describe('personal play path', () => {
  it('classifies playable routes without treating account pages as interests', () => {
    expect(playInterestForPath('/market/players')).toBe('market')
    expect(playInterestForPath('/quizzes/referee-decisions')).toBe('referee')
    expect(playInterestForPath('/quizzes/who-am-i')).toBe('quick-games')
    expect(playInterestForPath('/profile')).toBeNull()
  })

  it('chooses the strongest real interest and has no invented favourite', () => {
    const empty = emptyPlayInterestProfile()
    expect(strongestPlayInterest(empty)).toBeNull()
    expect(strongestPlayInterest({ ...empty, market: 3, tactics: 2 })).toBe('market')
  })
})
