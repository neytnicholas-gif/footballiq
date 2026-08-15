import { duelPacks } from '@/lib/duel-packs'
import { careerQuestions, higherLowerItems, refereeQuestions, scoutQuestions, whoAmIQuestions } from '@/lib/game-data'
import { getDailySeedFromKey } from '@/lib/daily'
import { calculateDuelXp } from '@/lib/progression'
import type { QuizProof } from '@/lib/quiz-proof'
import { expandedScoutScenarios } from '@/lib/scout-scenario-expansion'
import { getLeagueWorldQuestions } from '@/lib/football-leagues'
import { quizLabCorrectAnswer, quizLabQuestionBank, type QuizLabFormat } from '@/lib/quiz-lab'

export type QuizCompletionClaim = {
  quizId: string
  score: number
  total: number
  completionKey: string
  metrics?: {
    bestCombo?: number
    points?: number
  }
  proof: QuizProof
}

export type VerifiedQuizReward = QuizCompletionClaim & {
  xp: number
}

const DAILY_QUIZ_ID = /^daily-(\d{4}-\d{2}-\d{2})$/
const LEAGUE_WORLD_QUIZ_ID = /^league-world-([a-z0-9-]+)$/
const QUIZ_LAB_ID = /^quiz-lab-(odd-one-out|truth-trap|order-the-play|link-up|formation-fix)$/

function integer(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a whole number.`)
  }
  return value
}

function assertResult(score: number, total: number, expectedTotal: number) {
  if (total !== expectedTotal) throw new Error('Quiz length does not match the server definition.')
  if (score < 0 || score > total) throw new Error('Quiz score is outside the allowed range.')
}

function standardXp(score: number, total: number) {
  return 20 + score * 10 + (score === total ? 40 : 0)
}

function requireProof<K extends QuizProof['kind']>(proof: QuizProof, kind: K) {
  if (!proof || proof.kind !== kind) throw new Error('Quiz answer proof does not match this game.')
  return proof as Extract<QuizProof, { kind: K }>
}

function assertClaimedScore(claimed: number, verified: number) {
  if (claimed !== verified) throw new Error('Claimed score does not match the submitted answers.')
  return verified
}

function scoreChoiceAnswers(answers: number[], correct: number[]) {
  if (answers.length !== correct.length || answers.some((answer) => !Number.isSafeInteger(answer))) {
    throw new Error('Quiz answer proof is incomplete.')
  }
  return answers.reduce((score, answer, index) => score + (answer === correct[index] ? 1 : 0), 0)
}

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items]
  let value = seed || 1
  for (let index = copy.length - 1; index > 0; index -= 1) {
    value = (value * 9301 + 49297) % 233280
    const randomIndex = Math.floor((value / 233280) * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

const baseScoutVisionAnswers = new Map([
  ['scout-1', 'strong-follow'], ['scout-2', 'follow'], ['scout-3', 'strong-follow'],
  ['scout-4', 'monitor'], ['scout-5', 'follow'], ['scout-6', 'strong-follow'],
  ['scout-7', 'monitor'], ['scout-8', 'follow'], ['scout-9', 'follow'], ['scout-10', 'monitor'],
] as const)
const scoutVisionAnswers = new Map<string, string>([
  ...baseScoutVisionAnswers,
  ...expandedScoutScenarios.map((scenario) => [scenario.id, scenario.recommended] as const),
])

/**
 * Converts an untrusted browser claim into the only score/XP combinations the
 * game allows. The database receives the returned values, never raw XP from
 * the browser.
 */
export function verifyQuizReward(claim: QuizCompletionClaim): VerifiedQuizReward {
  const quizId = claim.quizId.trim()
  const score = integer(claim.score, 'Score')
  const total = integer(claim.total, 'Total')

  if (quizId === 'referee-decisions-1') {
    if (claim.proof.kind === 'scenario-choice') {
      const proof = requireProof(claim.proof, 'scenario-choice')
      if (proof.scenarioIds.length < 1 || proof.scenarioIds.length > 20 || new Set(proof.scenarioIds).size !== proof.scenarioIds.length) throw new Error('Referee session proof is invalid.')
      assertResult(score, total, proof.scenarioIds.length)
      const correct = proof.scenarioIds.map((scenarioId) => {
        const question = refereeQuestions.find((item) => item.id === scenarioId)
        if (!question) throw new Error('Referee session contains an unknown scenario.')
        return question.answer
      })
      const verifiedScore = assertClaimedScore(score, scoreChoiceAnswers(proof.answers, correct))
      return { ...claim, quizId, score: verifiedScore, total, xp: standardXp(verifiedScore, total) }
    }
    const proof = requireProof(claim.proof, 'choice')
    assertResult(score, total, refereeQuestions.length)
    const verifiedScore = assertClaimedScore(score, scoreChoiceAnswers(proof.answers, refereeQuestions.map((question) => question.answer)))
    return { ...claim, quizId, score: verifiedScore, total, xp: standardXp(verifiedScore, total) }
  }

  const dailyMatch = DAILY_QUIZ_ID.exec(quizId)
  if (dailyMatch) {
    const proof = requireProof(claim.proof, 'daily')
    assertResult(score, total, 5)
    if (proof.dateKey !== dailyMatch[1]) throw new Error('Daily answer proof uses the wrong date.')
    const seed = getDailySeedFromKey(proof.dateKey)
    const correct = Array.from({ length: 5 }, (_, index) => refereeQuestions[(seed + index * 3) % refereeQuestions.length]!.answer)
    const verifiedScore = assertClaimedScore(score, scoreChoiceAnswers(proof.answers, correct))
    return { ...claim, quizId, score: verifiedScore, total, xp: standardXp(verifiedScore, total) }
  }

  if (quizId === 'career-path-1') {
    const proof = requireProof(claim.proof, 'career')
    assertResult(score, total, careerQuestions.length)
    if (proof.answers.length !== careerQuestions.length) throw new Error('Quiz answer proof is incomplete.')
    const verifiedScore = assertClaimedScore(score, proof.answers.reduce((sum, answer, index) => sum + (answer.trim().toLowerCase() === careerQuestions[index]!.answer.toLowerCase() ? 1 : 0), 0))
    return { ...claim, quizId, score: verifiedScore, total, xp: 20 + verifiedScore * 10 }
  }

  if (quizId === 'who-am-i-1') {
    const proof = requireProof(claim.proof, 'who-am-i')
    assertResult(score, total, 40)
    if (proof.answers.length !== whoAmIQuestions.length) throw new Error('Quiz answer proof is incomplete.')
    const verifiedScore = assertClaimedScore(score, proof.answers.reduce((sum, answer, index) => {
      const clueCount = integer(answer.clues, 'Clue count')
      if (clueCount < 1 || clueCount > 4) throw new Error('Clue count is outside the allowed range.')
      const correct = answer.guess.trim().toLowerCase() === whoAmIQuestions[index]!.answer.toLowerCase()
      return sum + (correct ? 5 - clueCount : 0)
    }, 0))
    return { ...claim, quizId, score: verifiedScore, total, xp: 20 + verifiedScore * 3 }
  }

  if (quizId === 'higher-lower-pl-goals') {
    const proof = requireProof(claim.proof, 'higher-lower')
    assertResult(score, total, Math.max(1, higherLowerItems.length - 1))
    const deck = seededShuffle(higherLowerItems, integer(proof.deckSeed, 'Deck seed'))
    let verifiedScore = 0
    let ended = false
    for (let round = 0; round < proof.answers.length; round += 1) {
      const index = round + 1
      if (index >= deck.length || ended) throw new Error('Higher/lower answer proof is invalid.')
      const left = deck[index - 1]!
      const right = deck[index]!
      const correct = proof.answers[round] ? right.value >= left.value : right.value <= left.value
      if (!correct || index === deck.length - 1) ended = true
      else verifiedScore += 1
    }
    if (!ended) throw new Error('Higher/lower answer proof is incomplete.')
    assertClaimedScore(score, verifiedScore)
    return { ...claim, quizId, score: verifiedScore, total, xp: 20 + verifiedScore * 8 }
  }

  if (quizId === 'would-you-scout-1') {
    const proof = requireProof(claim.proof, 'scout-dossier')
    assertResult(score, total, scoutQuestions.length * 2)
    if (proof.answers.length !== scoutQuestions.length) throw new Error('Quiz answer proof is incomplete.')
    const verifiedScore = assertClaimedScore(score, proof.answers.reduce((sum, answer, index) => {
      const question = scoutQuestions[index]!
      return sum + (answer === question.strongestDecision ? 2 : answer === question.defensibleAlternative ? 1 : 0)
    }, 0))
    return { ...claim, quizId, score: verifiedScore, total, xp: 30 + verifiedScore * 6 }
  }

  if (quizId === 'would-you-scout-v1') {
    const proof = requireProof(claim.proof, 'scout-vision')
    assertResult(score, total, 10)
    if (proof.answers.length !== 10 || new Set(proof.answers.map((answer) => answer.scenarioId)).size !== 10) throw new Error('Quiz answer proof is incomplete.')
    const verifiedScore = assertClaimedScore(score, proof.answers.reduce((sum, answer) => sum + (scoutVisionAnswers.get(answer.scenarioId) === answer.decision ? 1 : 0), 0))
    return { ...claim, quizId, score: verifiedScore, total, xp: 30 + verifiedScore * 11 }
  }

  const leagueWorldMatch = LEAGUE_WORLD_QUIZ_ID.exec(quizId)
  if (leagueWorldMatch) {
    const questions = getLeagueWorldQuestions(leagueWorldMatch[1]!)
    if (!questions.length) throw new Error('Unknown league room.')
    const proof = requireProof(claim.proof, 'choice')
    assertResult(score, total, questions.length)
    const verifiedScore = assertClaimedScore(score, scoreChoiceAnswers(proof.answers, questions.map((question) => question.answer)))
    return { ...claim, quizId, score: verifiedScore, total, xp: standardXp(verifiedScore, total) }
  }

  const quizLabMatch = QUIZ_LAB_ID.exec(quizId)
  if (quizLabMatch) {
    const format = quizLabMatch[1] as QuizLabFormat
    const questions = quizLabQuestionBank[format]
    const proof = requireProof(claim.proof, 'quiz-lab')
    assertResult(score, total, questions.length)
    if (proof.format !== format || proof.answers.length !== questions.length || proof.answers.some((answer) => typeof answer !== 'string')) {
      throw new Error('Quiz Lab answer proof is incomplete.')
    }
    const verifiedScore = assertClaimedScore(score, proof.answers.reduce((sum, answer, index) => (
      sum + (answer === quizLabCorrectAnswer(questions[index]!) ? 1 : 0)
    ), 0))
    return { ...claim, quizId, score: verifiedScore, total, xp: standardXp(verifiedScore, total) }
  }

  const duel = duelPacks.find((pack) => pack.id === quizId)
  if (duel) {
    const proof = requireProof(claim.proof, 'duel')
    assertResult(score, total, duel.questions.length)
    if (proof.packId !== quizId || proof.answers.length !== total) throw new Error('Quiz answer proof is incomplete.')
    let verifiedScore = 0
    let combo = 0
    let bestCombo = 0
    let points = 0
    const unused = [...duel.questions]
    for (const answer of proof.answers) {
      const questionIndex = unused.findIndex((question) => (
        (question.left.name === answer.left && question.right.name === answer.right)
        || (question.left.name === answer.right && question.right.name === answer.left)
      ))
      if (questionIndex < 0) throw new Error('Duel answer proof contains an unknown pairing.')
      const source = unused.splice(questionIndex, 1)[0]!
      const leftValue = source.left.name === answer.left ? source.left.value : source.right.value
      const rightValue = source.right.name === answer.right ? source.right.value : source.left.value
      const correctChoice = leftValue === rightValue ? 'same' : leftValue > rightValue ? 'left' : 'right'
      const correct = answer.choice === correctChoice
      if (correct) {
        const timeLeft = integer(answer.timeLeft, 'Time left')
        if (timeLeft < 0 || timeLeft > 15) throw new Error('Duel time proof is outside the allowed range.')
        points += 100 + (answer.speed === 'timed' ? timeLeft * 5 : 0) + Math.min(200, combo * 25)
        combo += 1
        bestCombo = Math.max(bestCombo, combo)
        verifiedScore += 1
      } else combo = 0
    }
    assertClaimedScore(score, verifiedScore)
    return {
      ...claim,
      quizId,
      score: verifiedScore,
      total,
      metrics: { bestCombo, points },
      xp: calculateDuelXp(verifiedScore, total, bestCombo, points),
    }
  }

  throw new Error('Unknown quiz.')
}
