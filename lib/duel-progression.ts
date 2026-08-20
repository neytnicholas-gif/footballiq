import {
  coreDuelPacks,
  DUEL_CORE_PACKS_PER_THEME,
  getDuelThemeId,
  reserveDuelPacks,
} from './duel-packs'

export type DuelCompletionMap = Record<string, number>

export function hasCompletedDuelPack(completed: DuelCompletionMap, packId: string) {
  return typeof completed[packId] === 'number'
}

export function getDuelThemeProgress(completed: DuelCompletionMap, themeId: string) {
  const coreCompleted = coreDuelPacks.filter((pack) => (
    getDuelThemeId(pack.id) === themeId && hasCompletedDuelPack(completed, pack.id)
  )).length
  const reserveCompleted = reserveDuelPacks.filter((pack) => (
    getDuelThemeId(pack.id) === themeId && hasCompletedDuelPack(completed, pack.id)
  )).length

  return {
    coreCompleted,
    reserveCompleted,
    reserveUnlocked: coreCompleted === DUEL_CORE_PACKS_PER_THEME,
    coreRemaining: Math.max(0, DUEL_CORE_PACKS_PER_THEME - coreCompleted),
  }
}
