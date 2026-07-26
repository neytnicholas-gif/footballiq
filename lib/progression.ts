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

const levelColors = ['#6B7280', '#22C55E', '#0EA5E9', '#F59E0B', '#EF4444', '#E11D48']

export function getLevelInfo(totalXp: number) {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  const current = getRank(safeXp)
  const next = getNextRank(safeXp)
  const level = Math.max(1, ranks.findIndex((rank) => rank.title === current.title) + 1)

  if (!next) {
    return {
      level,
      xpInLevel: 1,
      xpNeeded: 1,
      progressPercentage: 100,
      color: getLevelColor(level),
    }
  }

  const xpInLevel = Math.max(0, safeXp - current.minXp)
  const xpNeeded = Math.max(1, next.minXp - current.minXp)
  const progressPercentage = Math.max(0, Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)))

  return {
    level,
    xpInLevel,
    xpNeeded,
    progressPercentage,
    color: getLevelColor(level),
  }
}

export function getLevelColor(level: number) {
  const safeLevel = Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1)
  return levelColors[Math.min(levelColors.length - 1, Math.floor((safeLevel - 1) / 2))]
}
