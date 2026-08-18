import { supabase } from '@/lib/supabase'
import type { QuizProof } from '@/lib/quiz-proof'

type SaveQuizResultResult = {
  error: Error | null
  alreadyCompleted: boolean
  xpAwarded?: number
  baseXp?: number
  dailyBucketRun?: number
}

type CompleteQuizResult = {
  awarded: boolean
  already_processed: boolean
  completion_key: string
  activity_date: string
  xp_awarded?: number
  base_xp?: number
  daily_bucket_run?: number
}

type QuizCompletionRequest = (payload: {
  quizId: string
  score: number
  total: number
  xp: number
  completionKey: string
  metrics?: { bestCombo?: number; points?: number }
  proof: QuizProof
}) => Promise<{ data: CompleteQuizResult | null; error: Error | null }>

const completionAttempts = new Map<string, Promise<SaveQuizResultResult>>()

const COMPLETION_KEY_MIN_LENGTH = 24
const COMPLETION_KEY_MAX_LENGTH = 120
const COMPLETION_KEY_PATTERN = /^[A-Za-z0-9:_-]+$/
let fallbackRunCounter = 0

function sanitizeCompletionPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-')
}

export function isValidCompletionKey(value: string) {
  return (
    value.length >= COMPLETION_KEY_MIN_LENGTH
    && value.length <= COMPLETION_KEY_MAX_LENGTH
    && COMPLETION_KEY_PATTERN.test(value)
  )
}

function assertValidCompletionKey(value: string) {
  if (!isValidCompletionKey(value)) {
    throw new Error('Invalid completion key format.')
  }
}

export function createCompletionRunId() {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) {
    return `run-${randomUuid.replace(/-/g, '')}`
  }

  fallbackRunCounter += 1
  const randomPart = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  return `run-${randomPart}-${fallbackRunCounter}`
}

export function buildCompletionKey(quizId: string, runKey: string | number) {
  const key = `cqk:${sanitizeCompletionPart(quizId)}:${sanitizeCompletionPart(String(runKey))}`
  assertValidCompletionKey(key)
  return key
}

export function resetCompletionAttemptsForTests() {
  completionAttempts.clear()
}

export async function saveQuizResult({
  quizId,
  score,
  total,
  xp,
  completionKey,
  metrics,
  proof,
}: {
  quizId: string
  score: number
  total: number
  xp: number
  completionKey: string
  metrics?: { bestCombo?: number; points?: number }
  proof: QuizProof
}, options?: { request?: QuizCompletionRequest }): Promise<SaveQuizResultResult> {
  assertValidCompletionKey(completionKey)

  const existingAttempt = completionAttempts.get(completionKey)
  if (existingAttempt) {
    return existingAttempt
  }

  const attempt = (async () => {
    if (options?.request) {
      const response = await options.request({ quizId, score, total, xp, completionKey, metrics, proof })
      if (response.error) {
        completionAttempts.delete(completionKey)
        return { error: response.error, alreadyCompleted: false }
      }
      return {
        error: null,
        alreadyCompleted: Boolean(response.data?.already_processed),
        ...(typeof response.data?.xp_awarded === 'number' ? { xpAwarded: response.data.xp_awarded } : {}),
        ...(typeof response.data?.base_xp === 'number' ? { baseXp: response.data.base_xp } : {}),
        ...(typeof response.data?.daily_bucket_run === 'number' ? { dailyBucketRun: response.data.daily_bucket_run } : {}),
      }
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (sessionError || !accessToken) {
      completionAttempts.delete(completionKey)
      return { error: sessionError ?? new Error('Sign in before saving a result.'), alreadyCompleted: false }
    }

    const response = await fetch('/api/quizzes/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quizId, score, total, xp, completionKey, metrics, proof }),
    })
    const payload = await response.json().catch(() => null) as (CompleteQuizResult & { error?: string }) | null
    if (!response.ok) {
      completionAttempts.delete(completionKey)
      return { error: new Error(payload?.error ?? 'Result could not be saved.'), alreadyCompleted: false }
    }

    return {
      error: null,
      alreadyCompleted: Boolean(payload?.already_processed),
      ...(typeof payload?.xp_awarded === 'number' ? { xpAwarded: payload.xp_awarded } : {}),
      ...(typeof payload?.base_xp === 'number' ? { baseXp: payload.base_xp } : {}),
      ...(typeof payload?.daily_bucket_run === 'number' ? { dailyBucketRun: payload.daily_bucket_run } : {}),
    }
  })()

  completionAttempts.set(completionKey, attempt)
  return attempt
}
