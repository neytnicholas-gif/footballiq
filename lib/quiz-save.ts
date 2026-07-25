import { supabase } from '@/lib/supabase'

type SaveQuizResultResult = {
  error: Error | null
  alreadyCompleted: boolean
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
  const today = activityDate ?? new Date().toISOString().slice(0, 10)

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { error } = await supabase.rpc('complete_quiz', {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_xp: xp,
    p_activity_date: today,
  })

  return { error: error as Error | null, alreadyCompleted: false }
}
