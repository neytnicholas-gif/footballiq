import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase/types'

export type QuizProgressStatus = 'in_progress' | 'completed'

export type QuizProgressRecord = {
  user_id: string
  quiz_id: string
  current_index: number
  score: number
  total: number
  progress: Record<string, unknown>
  status: QuizProgressStatus
  completed_at: string | null
  updated_at: string
}

type QuizProgressRow = Database['public']['Tables']['quiz_progress']['Row']
type QuizProgressInsert = Database['public']['Tables']['quiz_progress']['Insert']

type SaveQuizProgressInput = {
  quizId: string
  currentIndex: number
  score: number
  total: number
  progress: Record<string, unknown>
  status?: QuizProgressStatus
}

export async function loadQuizProgress(quizId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.error('Quiz progress auth error:', userError.message)
    return null
  }
  const user = userData.user
  if (!user) return null

  const { data, error } = await supabase
    .from('quiz_progress')
    .select('user_id, quiz_id, current_index, score, total, progress, status, completed_at, updated_at')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .maybeSingle()

  if (error) {
    console.error('Quiz progress load error:', error.message)
    return null
  }

  return (data as QuizProgressRow | null) ?? null
}

export async function saveQuizProgress({ quizId, currentIndex, score, total, progress, status = 'in_progress' }: SaveQuizProgressInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    return { error: userError }
  }
  const user = userData.user
  if (!user) {
    return { error: null }
  }

  const payload: QuizProgressInsert = {
    user_id: user.id,
    quiz_id: quizId,
    current_index: currentIndex,
    score,
    total,
    progress,
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('quiz_progress').upsert(payload, { onConflict: 'user_id,quiz_id' })
  return { error: error as Error | null }
}

export async function clearQuizProgress(quizId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    return { error: userError }
  }
  const user = userData.user
  if (!user) return { error: null }

  const { error } = await supabase.from('quiz_progress').delete().eq('user_id', user.id).eq('quiz_id', quizId)
  return { error: error as Error | null }
}