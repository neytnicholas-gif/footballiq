import { supabase } from '@/lib/supabase'

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
}) {
  const today = activityDate ?? new Date().toISOString().slice(0, 10)
  return supabase.rpc('complete_quiz', {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_xp: xp,
    p_activity_date: today,
  })
}
