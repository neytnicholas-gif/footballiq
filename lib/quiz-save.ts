import { supabase } from '@/lib/supabase'
import { getBrusselsDateKey } from '@/lib/daily'

type SaveQuizResultResult = {
  error: Error | null
  alreadyCompleted: boolean
}

function createAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function saveQuizResult({
  quizId,
  score,
  total,
  xp,
  activityDate,
}: {
  quizId: string
  score: number
  total: number
  xp: number
  activityDate?: string
}): Promise<SaveQuizResultResult> {
  const today = activityDate ?? getBrusselsDateKey()
  const attemptId = createAttemptId()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { error: userError, alreadyCompleted: false }
  }

  if (!user) {
    return { error: new Error('Not authenticated'), alreadyCompleted: false }
  }

  // Defensive idempotency guard: avoid duplicate rewards on rapid clicks/reloads.
  const { data: existing, error: existingError } = await supabase
    .from('quiz_results')
    .select('id')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .limit(1)

  if (!existingError && (existing?.length ?? 0) > 0) {
    return { error: null, alreadyCompleted: true }
  }

  const completionPayload = {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_xp: xp,
    p_activity_date: today,
    p_attempt_id: attemptId,
  }

  let rpcError: Error | null = null
  let usedAttemptAwareRpc = true

  {
    const { error } = await supabase.rpc('complete_quiz', completionPayload)
    rpcError = error as Error | null
  }

  if (rpcError) {
    const message = rpcError.message.toLowerCase()
    const missingAttemptSupport =
      message.includes('p_attempt_id')
      || message.includes('does not exist')
      || message.includes('function complete_quiz')

    if (missingAttemptSupport) {
      usedAttemptAwareRpc = false
      const { error } = await supabase.rpc('complete_quiz', {
        p_quiz_id: quizId,
        p_score: score,
        p_total: total,
        p_xp: xp,
        p_activity_date: today,
      })
      rpcError = error as Error | null
    }
  }

  if (!rpcError && usedAttemptAwareRpc) {
    const { data: inserted, error: insertCheckError } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('quiz_id', quizId)
      .eq('attempt_id', attemptId)
      .maybeSingle()

    if (insertCheckError) {
      return { error: insertCheckError, alreadyCompleted: false }
    }

    if (!inserted) {
      return { error: null, alreadyCompleted: true }
    }
  }

  return { error: rpcError, alreadyCompleted: false }
}
