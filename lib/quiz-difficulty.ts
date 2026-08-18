export const quizDifficulties = ['beginner', 'easy', 'normal', 'hard', 'expert'] as const

export type QuizDifficulty = (typeof quizDifficulties)[number]
export type AuthoredDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Starter' | 'Sharp' | 'Expert'

export const quizDifficultyMeta: Record<QuizDifficulty, {
  label: string
  shortCopy: string
  learningCopy: string
  xpMultiplier: number
  tone: string
}> = {
  beginner: {
    label: 'Beginner',
    shortCopy: 'Learn the basics',
    learningCopy: 'Clear questions and familiar football ideas.',
    xpMultiplier: 0.75,
    tone: 'border-sky-300/35 bg-sky-300/10 text-sky-100',
  },
  easy: {
    label: 'Easy',
    shortCopy: 'Build confidence',
    learningCopy: 'Simple decisions with a little more detail.',
    xpMultiplier: 0.9,
    tone: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100',
  },
  normal: {
    label: 'Normal',
    shortCopy: 'Balanced test',
    learningCopy: 'A fair mix of knowledge and judgement.',
    xpMultiplier: 1,
    tone: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100',
  },
  hard: {
    label: 'Hard',
    shortCopy: 'Read the details',
    learningCopy: 'Closer answers and more match context.',
    xpMultiplier: 1.25,
    tone: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  },
  expert: {
    label: 'Expert',
    shortCopy: 'Toughest calls',
    learningCopy: 'Fine details, uncertainty and difficult decisions.',
    xpMultiplier: 1.5,
    tone: 'border-violet-300/35 bg-violet-300/10 text-violet-100',
  },
}

export function isQuizDifficulty(value: unknown): value is QuizDifficulty {
  return typeof value === 'string' && quizDifficulties.includes(value as QuizDifficulty)
}

export function quizXp(baseXp: number, difficulty: QuizDifficulty) {
  if (!Number.isFinite(baseXp) || baseXp < 0) throw new Error('Base XP must be a positive number.')
  return Math.round(baseXp * quizDifficultyMeta[difficulty].xpMultiplier)
}

type DifficultyIndexOptions<T> = {
  id: (item: T) => string
  authored: (item: T) => AuthoredDifficulty
  text: (item: T) => string
}

function authoredBand(difficulty: AuthoredDifficulty) {
  if (difficulty === 'Easy' || difficulty === 'Starter') return 'foundation'
  if (difficulty === 'Medium' || difficulty === 'Sharp') return 'normal'
  return 'advanced'
}

function complexity(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const clauses = (text.match(/[,;:]/g) ?? []).length
  const conditions = (text.match(/\b(if|unless|except|however|although|while|before|after|without|despite|rather|only|not|instead)\b/gi) ?? []).length
  const technical = (text.match(/\b(offside|advantage|transition|overload|underload|deflection|deliberate|reckless|excessive|rest defence|cover shadow|half-space|interfering|denying|obvious|context|uncertainty)\b/gi) ?? []).length
  return words.length + clauses * 2 + conditions * 4 + technical * 3
}

/**
 * Expands the authored three-band content into five stable levels. Foundation
 * and advanced questions are ordered by actual wording/context complexity and
 * split in half. The authored middle band remains Normal.
 */
export function buildQuizDifficultyIndex<T>(items: readonly T[], options: DifficultyIndexOptions<T>) {
  const index = new Map<string, QuizDifficulty>()
  const foundations: T[] = []
  const advanced: T[] = []

  for (const item of items) {
    const band = authoredBand(options.authored(item))
    if (band === 'foundation') foundations.push(item)
    else if (band === 'advanced') advanced.push(item)
    else index.set(options.id(item), 'normal')
  }

  function rank(group: T[], lower: QuizDifficulty, upper: QuizDifficulty) {
    const ordered = [...group].sort((left, right) => {
      const difference = complexity(options.text(left)) - complexity(options.text(right))
      return difference || options.id(left).localeCompare(options.id(right))
    })
    const split = Math.ceil(ordered.length / 2)
    ordered.forEach((item, itemIndex) => index.set(options.id(item), itemIndex < split ? lower : upper))
  }

  rank(foundations, 'beginner', 'easy')
  rank(advanced, 'hard', 'expert')
  return index
}

export function filterQuizDifficulty<T>(items: readonly T[], difficulty: QuizDifficulty, index: ReadonlyMap<string, QuizDifficulty>, id: (item: T) => string) {
  return items.filter((item) => index.get(id(item)) === difficulty)
}

export function quizDifficultyCounts(index: ReadonlyMap<string, QuizDifficulty>) {
  return Object.fromEntries(quizDifficulties.map((difficulty) => [difficulty, [...index.values()].filter((value) => value === difficulty).length])) as Record<QuizDifficulty, number>
}

export function assertQuizDifficultySelection(ids: readonly string[], difficulty: QuizDifficulty, index: ReadonlyMap<string, QuizDifficulty>) {
  if (ids.some((id) => index.get(id) !== difficulty)) {
    throw new Error('Quiz answer proof contains a question outside the chosen difficulty.')
  }
}
