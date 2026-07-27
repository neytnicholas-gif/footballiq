export function getAccuracyPercent(correctAnswers: number, totalAnswers: number) {
  if (totalAnswers <= 0) return null
  return Math.round((correctAnswers / totalAnswers) * 100)
}

export function formatAccuracy(correctAnswers: number, totalAnswers: number) {
  const percent = getAccuracyPercent(correctAnswers, totalAnswers)
  return percent === null ? '—' : `${percent}%`
}

export function formatDayCount(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}