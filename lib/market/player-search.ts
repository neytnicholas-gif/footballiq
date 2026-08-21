type SearchablePlayer = {
  display_name: string
  short_name?: string | null
  club_name: string
  competition_name?: string | null
}

export function normalizePlayerSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(left: string, right: string) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      )
    }
    previous = current
  }

  return previous[right.length]!
}

function tokenScore(queryToken: string, candidateToken: string) {
  if (candidateToken === queryToken) return 100
  if (candidateToken.startsWith(queryToken)) return 92
  if (candidateToken.includes(queryToken)) return 86

  const allowedDistance = queryToken.length >= 8 ? 2 : queryToken.length >= 5 ? 1 : 0
  if (allowedDistance && Math.abs(candidateToken.length - queryToken.length) <= allowedDistance) {
    const distance = editDistance(queryToken, candidateToken)
    if (distance <= allowedDistance) return 78 - (distance * 8)
  }

  return 0
}

/**
 * Returns a relevance score instead of only a yes/no result so a name search
 * can put the most likely footballer first. Small spelling mistakes are allowed
 * for longer words, while short queries stay strict to avoid noisy results.
 */
export function scorePlayerSearch(player: SearchablePlayer, query: string) {
  const normalizedQuery = normalizePlayerSearch(query)
  if (!normalizedQuery) return 1

  const fields = [
    { value: player.display_name, weight: 400 },
    { value: player.short_name, weight: 360 },
    { value: player.club_name, weight: 260 },
    { value: player.competition_name, weight: 180 },
  ].filter((field): field is { value: string; weight: number } => Boolean(field.value))

  let bestDirectScore = 0
  for (const field of fields) {
    const normalizedValue = normalizePlayerSearch(field.value)
    if (normalizedValue === normalizedQuery) bestDirectScore = Math.max(bestDirectScore, field.weight + 100)
    else if (normalizedValue.startsWith(normalizedQuery)) bestDirectScore = Math.max(bestDirectScore, field.weight + 80)
    else if (normalizedValue.includes(normalizedQuery)) bestDirectScore = Math.max(bestDirectScore, field.weight + 60)
  }
  if (bestDirectScore) return bestDirectScore

  const queryTokens = normalizedQuery.split(' ')
  const candidateTokens = fields.flatMap((field) => normalizePlayerSearch(field.value).split(' '))
  const tokenScores = queryTokens.map((queryToken) => Math.max(...candidateTokens.map((candidateToken) => tokenScore(queryToken, candidateToken))))

  if (tokenScores.some((score) => score === 0)) return 0
  return Math.round(tokenScores.reduce((total, score) => total + score, 0) / tokenScores.length)
}

export function matchesPlayerSearch(player: SearchablePlayer, query: string) {
  return scorePlayerSearch(player, query) > 0
}
