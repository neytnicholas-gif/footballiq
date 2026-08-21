import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DISTINCT_LEVEL_COLOUR_COUNT, getLevelColor, getLevelInfo, getLevelPalette, getRank, getRankProgress, getXpAtStartOfLevel, xpNeededForLevelUp } from '@/lib/progression'
import { SITE_ONBOARDING_VERSION, isOnboardingRoute, onboardingSessionKey, onboardingStorageKey } from '@/lib/onboarding'

describe('overall level progression', () => {
  it('starts quickly and becomes steadily harder without sudden jumps', () => {
    expect(xpNeededForLevelUp(1)).toBe(90)
    expect(xpNeededForLevelUp(10)).toBe(145)
    expect(xpNeededForLevelUp(100)).toBe(495)
    expect(xpNeededForLevelUp(1000)).toBe(3455)

    let previous = xpNeededForLevelUp(1)
    for (let level = 2; level <= DISTINCT_LEVEL_COLOUR_COUNT; level += 1) {
      const needed = xpNeededForLevelUp(level)
      expect(needed).toBeGreaterThanOrEqual(previous)
      expect(needed - previous).toBeLessThanOrEqual(10)
      previous = needed
    }
  })

  it('maps exact XP boundaries to the correct level and continues after 1000', () => {
    expect(getLevelInfo(0).level).toBe(1)
    expect(getLevelInfo(getXpAtStartOfLevel(2) - 1).level).toBe(1)
    expect(getLevelInfo(getXpAtStartOfLevel(2)).level).toBe(2)
    expect(getLevelInfo(getXpAtStartOfLevel(1000)).level).toBe(1000)
    expect(getLevelInfo(getXpAtStartOfLevel(1001)).level).toBe(1001)
    expect(getLevelInfo(Number.NaN).level).toBe(1)
  })

  it('gives every level from 1 to 1000 a distinct colour', () => {
    const colours = Array.from({ length: DISTINCT_LEVEL_COLOUR_COUNT }, (_, index) => getLevelColor(index + 1))
    expect(new Set(colours).size).toBe(DISTINCT_LEVEL_COLOUR_COUNT)
  })

  it('keeps named rank milestones meaningful through the level-1000 journey', () => {
    expect(getRank(22000).title).toBe('Legend')
    expect(getRank(275000).title).toBe('World Class')
    expect(getRank(1500000).title).toBe('Eternal Great')
    expect(getRankProgress(1499999).next?.title).toBe('Eternal Great')
    expect(getRankProgress(1500000).next).toBeNull()
  })

  it('keeps every level badge dark enough for its white label', () => {
    for (let level = 1; level <= DISTINCT_LEVEL_COLOUR_COUNT; level += 1) {
      const lightnessStops = [...getLevelPalette(level).badge.matchAll(/72% (\d+)%/g)].map((match) => Number(match[1]))
      expect(lightnessStops).toEqual([19, 25])
    }
  })
})

describe('first-time guide', () => {
  it('uses versioned, account-specific storage keys', () => {
    expect(SITE_ONBOARDING_VERSION).toBeGreaterThan(0)
    expect(onboardingStorageKey()).toContain('guest')
    expect(onboardingStorageKey('player-1')).toContain('user:player-1')
    expect(onboardingStorageKey('player-1')).not.toBe(onboardingStorageKey('player-2'))
    expect(onboardingSessionKey()).toContain('guest')
    expect(onboardingSessionKey('player-1')).toContain('user:player-1')
  })

  it('appears only in the playable and help areas', () => {
    expect(isOnboardingRoute('/')).toBe(true)
    expect(isOnboardingRoute('/market/players')).toBe(true)
    expect(isOnboardingRoute('/quizzes/tactical-lab')).toBe(true)
    expect(isOnboardingRoute('/quizzes/start-bench-sell')).toBe(false)
    expect(isOnboardingRoute('/how-to-play')).toBe(true)
    expect(isOnboardingRoute('/terms')).toBe(false)
    expect(isOnboardingRoute('/auth/callback')).toBe(false)
  })

  it('persists account completion through a narrowly scoped authenticated function', () => {
    const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260817100919_add_progression_onboarding.sql'), 'utf8')
    expect(migration).toMatch(/security definer/i)
    expect(migration).toMatch(/uid uuid := auth\.uid\(\)/i)
    expect(migration).toMatch(/grant execute on function public\.complete_site_onboarding\(integer\) to authenticated/i)
    expect(migration).toMatch(/revoke all on function public\.complete_site_onboarding\(integer\) from public, anon, authenticated/i)
  })
})
