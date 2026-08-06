import { supabase } from '@/lib/supabase'

type SaveQuizResultResult = {
  error: Error | null
  alreadyCompleted: boolean
}

type CompleteQuizPayload = {
  p_quiz_id: string
  p_score: number
  p_total: number
  p_xp: number
  p_completion_key: string
}

type CompleteQuizResult = {
  awarded: boolean
  already_processed: boolean
  completion_key: string
  activity_date: string
}

type CompleteQuizRpc = (
  functionName: 'complete_quiz',
  payload: CompleteQuizPayload,
) => Promise<{ data: CompleteQuizResult | null; error: Error | null }>

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
}: {
  quizId: string
  score: number
  total: number
  xp: number
  completionKey: string
}, options?: {
  rpc?: CompleteQuizRpc
}): Promise<SaveQuizResultResult> {
  assertValidCompletionKey(completionKey)

  const existingAttempt = completionAttempts.get(completionKey)
  if (existingAttempt) {
    return existingAttempt
  }

  const rpc = options?.rpc ?? ((fn, payload) => supabase.rpc(fn, payload))
  const attempt = (async () => {
    const response = await rpc('complete_quiz', {
      p_quiz_id: quizId,
      p_score: score,
      p_total: total,
      p_xp: xp,
      p_completion_key: completionKey,
    })

    if (response.error) {
      completionAttempts.delete(completionKey)
      return { error: response.error, alreadyCompleted: false }
    }

    return {
      error: null,
      alreadyCompleted: Boolean(response.data?.already_processed),
    }
  })()

  completionAttempts.set(completionKey, attempt)
  return attempt
}
