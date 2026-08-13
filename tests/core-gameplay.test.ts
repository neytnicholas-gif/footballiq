import { describe, expect, it } from 'vitest'
import {
  buildCompletionKey,
  createCompletionRunId,
  isValidCompletionKey,
  resetCompletionAttemptsForTests,
  saveQuizResult,
} from '@/lib/quiz-save'
import type { QuizProof } from '@/lib/quiz-proof'

type TestCompletionPayload = {
  quizId: string
  score: number
  total: number
  xp: number
  completionKey: string
  metrics?: { bestCombo?: number; points?: number }
  proof: QuizProof
}

const testProof: QuizProof = { kind: 'choice', answers: [] }

describe('quiz save progression integrity', () => {
  it('reuses an in-flight completion attempt', async () => {
    resetCompletionAttemptsForTests()

    let calls = 0
    let release: (() => void) | null = null
    const request = async (payload: TestCompletionPayload) => {
      calls += 1
      expect(isValidCompletionKey(payload.completionKey)).toBe(true)
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return {
        data: {
          awarded: true,
          already_processed: false,
          completion_key: payload.completionKey,
          activity_date: '2026-08-01',
        },
        error: null,
      }
    }

    const completionKey = buildCompletionKey('referee-arena', createCompletionRunId())
    const firstAttempt = saveQuizResult({ quizId: 'referee-arena', score: 4, total: 5, xp: 72, completionKey, proof: testProof }, { request })
    const secondAttempt = saveQuizResult({ quizId: 'referee-arena', score: 4, total: 5, xp: 72, completionKey, proof: testProof }, { request })

    expect(calls).toBe(1)
    expect(release).not.toBeNull()
    release!()

    const [firstResult, secondResult] = await Promise.all([firstAttempt, secondAttempt])
    expect(firstResult).toEqual({ error: null, alreadyCompleted: false })
    expect(secondResult).toEqual(firstResult)
  })

  it('allows retry after a failed attempt with the same completion key', async () => {
    resetCompletionAttemptsForTests()

    let calls = 0
    const request = async (payload: TestCompletionPayload) => {
      calls += 1
      if (calls === 1) {
        return { data: null, error: new Error('Temporary failure') }
      }

      return {
        data: {
          awarded: true,
          already_processed: false,
          completion_key: payload.completionKey,
          activity_date: '2026-08-01',
        },
        error: null,
      }
    }

    const completionKey = buildCompletionKey('daily-2026-08-01', createCompletionRunId())
    const firstResult = await saveQuizResult({ quizId: 'daily-2026-08-01', score: 5, total: 5, xp: 110, completionKey, proof: testProof }, { request })
    const secondResult = await saveQuizResult({ quizId: 'daily-2026-08-01', score: 5, total: 5, xp: 110, completionKey, proof: testProof }, { request })

    expect(calls).toBe(2)
    expect(firstResult.error?.message).toBe('Temporary failure')
    expect(firstResult.alreadyCompleted).toBe(false)
    expect(secondResult).toEqual({ error: null, alreadyCompleted: false })
  })

  it('keeps completion keys stable within a run and changes them for a replay', () => {
    const firstRunId = createCompletionRunId()
    const firstKeyA = buildCompletionKey('referee-arena', firstRunId)
    const firstKeyB = buildCompletionKey('referee-arena', firstRunId)
    const secondRunId = createCompletionRunId()
    const secondKey = buildCompletionKey('referee-arena', secondRunId)

    expect(firstKeyA).toBe(firstKeyB)
    expect(secondRunId).not.toBe(firstRunId)
    expect(secondKey).not.toBe(firstKeyA)
    expect(isValidCompletionKey(firstKeyA)).toBe(true)
    expect(() => buildCompletionKey('referee arena', '')).toThrow('Invalid completion key format.')
  })

  it('sends completion key and reports already processed responses', async () => {
    resetCompletionAttemptsForTests()

    let seenCompletionKey: string | null = null
    const request = async (payload: TestCompletionPayload) => {
      seenCompletionKey = payload.completionKey
      return {
        data: {
          awarded: false,
          already_processed: true,
          completion_key: String(payload.completionKey),
          activity_date: '2026-08-01',
        },
        error: null,
      }
    }

    const completionKey = buildCompletionKey('referee-arena', createCompletionRunId())
    const result = await saveQuizResult({ quizId: 'referee-arena', score: 3, total: 5, xp: 42, completionKey, proof: testProof }, { request })

    expect(result).toEqual({ error: null, alreadyCompleted: true })
    expect(seenCompletionKey).toBe(completionKey)
  })
})
