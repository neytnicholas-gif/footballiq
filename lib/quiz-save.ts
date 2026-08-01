import { supabase } from '@/lib/supabase'
import { getBrusselsDateISO } from '@/lib/brussels-time'

type CompleteQuizPayload = {
  p_quiz_id: string
  p_score: number
  p_total: number
  p_xp: number
  p_activity_date: string
}

type CompleteQuizRpc = (
  functionName: 'complete_quiz',
  payload: CompleteQuizPayload,
) => Promise<{ data: unknown; error: { message?: string } | null }>

type SaveQuizResultResponse = {
  data: unknown
  error: { message?: string } | null
  skipped: boolean
}

const completionAttempts = new Map<string, Promise<SaveQuizResultResponse>>()

export function buildCompletionKey(quizId: string, runKey: string | number) {
  return `${quizId}:${runKey}`
}

export function resetCompletionAttemptsForTests() {
  completionAttempts.clear()
}

export async function saveQuizResult(
  {
    quizId,
    score,
    total,
    xp,
    completionKey,
    activityDate = getBrusselsDateISO(),
  }: {
    quizId: string
    score: number
    total: number
    xp: number
    completionKey?: string
    activityDate?: string
  },
  options?: {
    rpc?: CompleteQuizRpc
  },
) {
  const attemptKey = completionKey ?? `${quizId}:${activityDate}:${score}:${total}:${xp}`
  const existingAttempt = completionAttempts.get(attemptKey)
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
      p_activity_date: activityDate,
    })

    if (response.error) {
      completionAttempts.delete(attemptKey)
    }

    return { ...response, skipped: false }
  })()

  completionAttempts.set(attemptKey, attempt)
  return attempt
}
