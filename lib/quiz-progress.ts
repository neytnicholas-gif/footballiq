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

type StoredQuizProgress = {
  record: QuizProgressRecord
  ownerId: string
  pendingSync: boolean
}

const LOCAL_PREFIX = 'early-shout:quiz-progress:v2:'
const GUEST_ID = 'guest'

function storageKey(ownerId: string, quizId: string) {
  return `${LOCAL_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(quizId)}`
}

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStored(ownerId: string, quizId: string): StoredQuizProgress | null {
  if (!storageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId, quizId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredQuizProgress>
    const record = parsed.record
    if (!record || parsed.ownerId !== ownerId || record.quiz_id !== quizId || !Number.isInteger(record.current_index) || typeof record.updated_at !== 'string') return null
    return { record: record as QuizProgressRecord, ownerId, pendingSync: Boolean(parsed.pendingSync) }
  } catch {
    return null
  }
}

function writeStored(ownerId: string, record: QuizProgressRecord, pendingSync: boolean) {
  if (!storageAvailable()) return false
  try {
    const value: StoredQuizProgress = { record, ownerId, pendingSync }
    window.localStorage.setItem(storageKey(ownerId, record.quiz_id), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function removeStored(ownerId: string, quizId: string) {
  if (!storageAvailable()) return
  try {
    window.localStorage.removeItem(storageKey(ownerId, quizId))
  } catch {
    // A blocked storage area should never make a game unusable.
  }
}

function localRecord(ownerId: string, input: SaveQuizProgressInput): QuizProgressRecord {
  const updatedAt = new Date().toISOString()
  return {
    user_id: ownerId,
    quiz_id: input.quizId,
    current_index: input.currentIndex,
    score: input.score,
    total: input.total,
    progress: input.progress,
    status: input.status ?? 'in_progress',
    completed_at: input.status === 'completed' ? updatedAt : null,
    updated_at: updatedAt,
  }
}

function newest(remote: QuizProgressRow | null, local: StoredQuizProgress | null) {
  if (!remote) return local?.record ?? null
  if (!local) return remote
  return Date.parse(local.record.updated_at) > Date.parse(remote.updated_at) ? local.record : remote
}

export async function loadQuizProgress(quizId: string) {
  const { data: userData, error: userError } = await supabase.auth.getSession()
  const user = userData.session?.user
  if (userError || !user) return readStored(GUEST_ID, quizId)?.record ?? null

  const local = readStored(user.id, quizId)
  const { data, error } = await supabase
    .from('quiz_progress')
    .select('user_id, quiz_id, current_index, score, total, progress, status, completed_at, updated_at')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .maybeSingle()

  if (error) {
    console.warn('Quiz progress is using the on-device copy until the connection recovers.')
    return local?.record ?? null
  }

  const result = newest((data as QuizProgressRow | null) ?? null, local)
  if (data && (!local || Date.parse(data.updated_at) >= Date.parse(local.record.updated_at))) removeStored(user.id, quizId)
  return result
}

export async function saveQuizProgress(input: SaveQuizProgressInput) {
  const { data: userData, error: userError } = await supabase.auth.getSession()
  const user = userData.session?.user
  if (userError || !user) {
    writeStored(GUEST_ID, localRecord(GUEST_ID, input), false)
    return { error: null, pendingSync: false }
  }

  const record = localRecord(user.id, input)
  const payload: QuizProgressInsert = { ...record }
  const { error } = await supabase.from('quiz_progress').upsert(payload, { onConflict: 'user_id,quiz_id' })
  if (error) {
    writeStored(user.id, record, true)
    return { error: null, pendingSync: true }
  }

  removeStored(user.id, input.quizId)
  return { error: null, pendingSync: false }
}

export async function clearQuizProgress(quizId: string) {
  removeStored(GUEST_ID, quizId)
  const { data: userData, error: userError } = await supabase.auth.getSession()
  const user = userData.session?.user
  if (userError || !user) return { error: null }

  removeStored(user.id, quizId)
  const { error } = await supabase.from('quiz_progress').delete().eq('user_id', user.id).eq('quiz_id', quizId)
  return { error: error as Error | null }
}

/** Flushes signed-in rounds that were saved while the phone was offline. */
export async function syncPendingQuizProgress() {
  if (!storageAvailable() || (typeof navigator !== 'undefined' && !navigator.onLine)) return { synced: 0 }
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return { synced: 0 }

  const ownerPrefix = `${LOCAL_PREFIX}${encodeURIComponent(user.id)}:`
  const pending: StoredQuizProgress[] = []
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith(ownerPrefix)) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const stored = JSON.parse(raw) as StoredQuizProgress
      if (stored.ownerId === user.id && stored.pendingSync) pending.push(stored)
    }
  } catch {
    return { synced: 0 }
  }

  let synced = 0
  for (const item of pending) {
    const payload: QuizProgressInsert = { ...item.record, user_id: user.id }
    const { error } = await supabase.from('quiz_progress').upsert(payload, { onConflict: 'user_id,quiz_id' })
    if (!error) {
      removeStored(user.id, item.record.quiz_id)
      synced += 1
    }
  }
  return { synced }
}
