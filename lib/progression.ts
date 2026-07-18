/**
 * Progression system utilities
 * XP-based leveling with infinite progression
 */

/**
 * Calculate total XP required to reach a specific level
 * Formula: 100 * (level - 1) * level / 2
 */
export function totalXpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2
}

/**
 * Get current level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1
  while (totalXpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

/**
 * Get XP earned in the current level
 */
export function getXpInCurrentLevel(totalXp: number): number {
  const currentLevel = getLevelFromXp(totalXp)
  const xpForCurrentLevel = totalXpForLevel(currentLevel)
  return totalXp - xpForCurrentLevel
}

/**
 * Get XP required for next level
 */
export function getXpForNextLevel(totalXp: number): number {
  const currentLevel = getLevelFromXp(totalXp)
  const xpForCurrentLevel = totalXpForLevel(currentLevel)
  const xpForNextLevel = totalXpForLevel(currentLevel + 1)
  return xpForNextLevel - xpForCurrentLevel
}

/**
 * Get progress percentage to next level (0-100)
 */
export function getProgressPercentage(totalXp: number): number {
  const xpInLevel = getXpInCurrentLevel(totalXp)
  const xpNeeded = getXpForNextLevel(totalXp)
  return Math.floor((xpInLevel / xpNeeded) * 100)
}

/**
 * Get deterministic HSL color for a level
 * Uses golden angle (137.508°) for good color distribution
 */
export function getLevelColor(level: number): string {
  const hue = (level * 137.508) % 360
  return `hsl(${hue}, 70%, 60%)`
}

/**
 * Get level info object
 */
export function getLevelInfo(totalXp: number) {
  const level = getLevelFromXp(totalXp)
  const xpInLevel = getXpInCurrentLevel(totalXp)
  const xpNeeded = getXpForNextLevel(totalXp)
  const progressPercentage = getProgressPercentage(totalXp)
  const color = getLevelColor(level)

  return {
    level,
    totalXp,
    xpInLevel,
    xpNeeded,
    xpToNextLevel: xpNeeded - xpInLevel,
    progressPercentage,
    color,
  }
}
