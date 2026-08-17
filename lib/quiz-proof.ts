import type { ScoutDecision as DossierDecision } from '@/lib/game-data'
import type { QuizLabFormat } from '@/lib/quiz-lab'
import type { ScoutRecommendation } from '@/lib/scout-scenario-expansion'

export type QuizProof =
  | { kind: 'choice'; answers: number[] }
  | { kind: 'scenario-choice'; scenarioIds: string[]; answers: number[] }
  | { kind: 'tactical-choice'; scenarioIds: string[]; answers: number[] }
  | { kind: 'daily'; dateKey: string; answers: number[] }
  | { kind: 'career'; round: number; answers: string[] }
  | { kind: 'who-am-i'; round: number; answers: Array<{ guess: string; clues: number }> }
  | { kind: 'scout-dossier'; answers: DossierDecision[] }
  | { kind: 'scout-vision'; answers: Array<{ scenarioId: string; decision: ScoutRecommendation }> }
  | { kind: 'higher-lower'; deckId: string; deckSeed: number; answers: boolean[] }
  | { kind: 'quiz-lab'; format: QuizLabFormat; round?: number; answers: string[] }
  | {
      kind: 'duel'
      packId: string
      answers: Array<{
        left: string
        right: string
        choice: 'left' | 'right' | 'same' | 'timeout'
        speed: 'relaxed' | 'timed'
        timeLeft: number
      }>
    }
