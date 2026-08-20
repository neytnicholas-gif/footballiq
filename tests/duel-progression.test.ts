import { describe, expect, it } from 'vitest'
import { coreDuelPacks, getDuelThemeId, reserveDuelPacks } from '@/lib/duel-packs'
import { getDuelThemeProgress, hasCompletedDuelPack } from '@/lib/duel-progression'

describe('Football Duels Extra Time progression', () => {
  const themeId = getDuelThemeId(coreDuelPacks[0]!.id)
  const themeCore = coreDuelPacks.filter((pack) => getDuelThemeId(pack.id) === themeId)
  const themeReserve = reserveDuelPacks.filter((pack) => getDuelThemeId(pack.id) === themeId)

  it('keeps all three reserve packs locked until every core pack is complete', () => {
    const almostComplete = Object.fromEntries(themeCore.slice(0, -1).map((pack) => [pack.id, 0]))
    expect(getDuelThemeProgress(almostComplete, themeId)).toEqual({
      coreCompleted: 9,
      reserveCompleted: 0,
      reserveUnlocked: false,
      coreRemaining: 1,
    })

    const complete = { ...almostComplete, [themeCore.at(-1)!.id]: 0 }
    expect(getDuelThemeProgress(complete, themeId).reserveUnlocked).toBe(true)
    expect(hasCompletedDuelPack(complete, themeCore.at(-1)!.id)).toBe(true)
  })

  it('tracks reserve completion without changing the permanent unlock', () => {
    const completed = Object.fromEntries([
      ...themeCore.map((pack) => [pack.id, 7] as const),
      ...themeReserve.slice(0, 2).map((pack) => [pack.id, 8] as const),
    ])
    expect(getDuelThemeProgress(completed, themeId)).toEqual({
      coreCompleted: 10,
      reserveCompleted: 2,
      reserveUnlocked: true,
      coreRemaining: 0,
    })
  })

  it('does not let completions from another theme unlock this one', () => {
    const otherTheme = coreDuelPacks.find((pack) => getDuelThemeId(pack.id) !== themeId)!
    const wrongProgress = { [otherTheme.id]: 10 }
    expect(getDuelThemeProgress(wrongProgress, themeId).reserveUnlocked).toBe(false)
  })
})
