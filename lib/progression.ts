export type Rank = {
  title: string
  minXp: number
  emoji: string
  nextTitle?: string
}

export const ranks: Rank[] = [
  { title: 'Football Fan', minXp: 0, emoji: '⚽', nextTitle: 'Sunday Player' },
  { title: 'Sunday Player', minXp: 250, emoji: '👟', nextTitle: 'Academy Prospect' },
  { title: 'Academy Prospect', minXp: 750, emoji: '🌱', nextTitle: 'Talent Scout' },
  { title: 'Talent Scout', minXp: 1500, emoji: '🔎', nextTitle: 'Elite Scout' },
  { title: 'Elite Scout', minXp: 3000, emoji: '🎯', nextTitle: 'Head Scout' },
  { title: 'Head Scout', minXp: 5500, emoji: '📋', nextTitle: 'Sporting Director' },
  { title: 'Sporting Director', minXp: 9000, emoji: '🧠', nextTitle: 'Football Genius' },
  { title: 'Football Genius', minXp: 14000, emoji: '✨', nextTitle: 'Legend' },
  { title: 'Legend', minXp: 22000, emoji: '👑' },
]

export function getRank(xp: number) {
  return [...ranks].reverse().find((rank) => xp >= rank.minXp) ?? ranks[0]
}

export function getNextRank(xp: number) {
  return ranks.find((rank) => rank.minXp > xp) ?? null
}

export function getRankProgress(xp: number) {
  const current = getRank(xp)
  const next = getNextRank(xp)
  if (!next) return { current, next: null, percent: 100, remaining: 0 }
  const span = next.minXp - current.minXp
  const gained = xp - current.minXp
  return {
    current,
    next,
    percent: Math.max(0, Math.min(100, Math.round((gained / span) * 100))),
    remaining: Math.max(0, next.minXp - xp),
  }
}

export function calculateDuelXp(score: number, total: number, bestCombo: number, points: number) {
  const perfect = score === total
  const accuracyBonus = Math.round((score / total) * 40)
  const comboBonus = Math.min(bestCombo, 5) * 5
  const speedBonus = Math.min(30, Math.floor(points / 500) * 3)
  return 20 + score * 10 + accuracyBonus + comboBonus + speedBonus + (perfect ? 60 : 0)
}

/**
 * Levels are deliberately separate from named ranks. A rank is a milestone;
 * a level is the small, regular reward a player sees between milestones.
 *
 * The curve starts gently, gets gradually harder through level 1000, then
 * keeps going at the level-1000 pace. That gives the system no artificial
 * ceiling without turning later levels into an unreasonable grind.
 */
export const DISTINCT_LEVEL_COLOUR_COUNT = 1000

function roundToFive(value: number) {
  return Math.round(value / 5) * 5
}

export function xpNeededForLevelUp(level: number) {
  const safeLevel = Math.max(1, Math.min(DISTINCT_LEVEL_COLOUR_COUNT, Number.isFinite(level) ? Math.floor(level) : 1))
  return roundToFive(75 + safeLevel * 3 + 12 * Math.sqrt(safeLevel))
}

const levelStartXp: number[] = [0]
for (let level = 1; level < DISTINCT_LEVEL_COLOUR_COUNT; level += 1) {
  levelStartXp.push(levelStartXp[level - 1] + xpNeededForLevelUp(level))
}

export function getXpAtStartOfLevel(level: number) {
  const safeLevel = Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1)
  if (safeLevel <= DISTINCT_LEVEL_COLOUR_COUNT) return levelStartXp[safeLevel - 1]
  const extraLevels = safeLevel - DISTINCT_LEVEL_COLOUR_COUNT
  return levelStartXp[DISTINCT_LEVEL_COLOUR_COUNT - 1] + extraLevels * xpNeededForLevelUp(DISTINCT_LEVEL_COLOUR_COUNT)
}

export function getLevelInfo(totalXp: number) {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? Math.floor(totalXp) : 0)
  const level1000Start = levelStartXp[DISTINCT_LEVEL_COLOUR_COUNT - 1]

  let level: number
  let xpInLevel: number
  let xpNeeded: number

  if (safeXp >= level1000Start) {
    xpNeeded = xpNeededForLevelUp(DISTINCT_LEVEL_COLOUR_COUNT)
    const earnedAfterLevel1000 = safeXp - level1000Start
    level = DISTINCT_LEVEL_COLOUR_COUNT + Math.floor(earnedAfterLevel1000 / xpNeeded)
    xpInLevel = earnedAfterLevel1000 % xpNeeded
  } else {
    let low = 0
    let high = levelStartXp.length - 1
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      if (levelStartXp[middle] <= safeXp) low = middle + 1
      else high = middle - 1
    }
    level = high + 1
    xpInLevel = safeXp - levelStartXp[high]
    xpNeeded = xpNeededForLevelUp(level)
  }

  return {
    level,
    xpInLevel,
    xpNeeded,
    xpToNextLevel: Math.max(0, xpNeeded - xpInLevel),
    progressPercentage: Math.max(0, Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))),
    color: getLevelColor(level),
    palette: getLevelPalette(level),
  }
}

export function getLevelPalette(level: number) {
  const safeLevel = Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1)
  const colourIndex = (safeLevel - 1) % DISTINCT_LEVEL_COLOUR_COUNT
  const hue = Number(((158 + colourIndex * 137.507764) % 360).toFixed(3))
  const secondHue = Number(((hue + 24 + (colourIndex % 7) * 3) % 360).toFixed(3))

  return {
    accent: `hsl(${hue} 76% 42%)`,
    badge: `linear-gradient(135deg, hsl(${hue} 72% 28%), hsl(${secondHue} 72% 35%))`,
    soft: `hsl(${hue} 72% 92%)`,
    ring: `hsl(${hue} 78% 55%)`,
    foreground: '#ffffff',
  }
}

export function getLevelColor(level: number) {
  return getLevelPalette(level).accent
}
