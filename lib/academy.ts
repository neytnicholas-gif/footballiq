import { supabase } from '@/lib/supabase'

export type AcademyTrack = 'scout' | 'referee'

export type AcademyExperience = {
  key: string
  track: AcademyTrack
  title: string
  type: 'free' | 'pro'
  status: 'available' | 'coming-next' | 'planned-later'
  href: string
}

export type AcademyCompletion = {
  experience_key: string
  track: AcademyTrack
  completed_at: string
  confidence_label: string | null
}

export const academyExperiences: AcademyExperience[] = [
  {
    key: 'scout-standard-dossiers',
    track: 'scout',
    title: 'Scout Vision Standard Dossiers',
    type: 'free',
    status: 'available',
    href: '/quizzes/would-you-scout-him',
  },
  {
    key: 'scout-room-player-evaluation',
    track: 'scout',
    title: 'Scout Room: Player Evaluation',
    type: 'free',
    status: 'available',
    href: '/academy/scout/scout-room-player-evaluation',
  },
  {
    key: 'scout-video-lab',
    track: 'scout',
    title: 'Scout Video Lab',
    type: 'free',
    status: 'coming-next',
    href: '/pro',
  },
  {
    key: 'referee-standard-arena',
    track: 'referee',
    title: 'Referee Arena Standard Scenarios',
    type: 'free',
    status: 'available',
    href: '/quizzes/referee-decisions',
  },
  {
    key: 'referee-debrief-penalty-area',
    track: 'referee',
    title: 'Referee Debrief: Penalty-Area Decision',
    type: 'free',
    status: 'available',
    href: '/academy/referee/referee-debrief-penalty-area',
  },
  {
    key: 'referee-var-lab',
    track: 'referee',
    title: 'VAR Intervention Lab',
    type: 'free',
    status: 'planned-later',
    href: '/pro',
  },
]

const LOCAL_COMPLETION_KEY = 'fiq-academy-completions-v1'

export async function loadAcademyCompletions() {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return {
      data: readLocalCompletions(),
      error: null as Error | null,
    }
  }

  const { data, error } = await supabase
    .from('academy_completions')
    .select('experience_key, track, completed_at, confidence_label')
    .eq('user_id', authData.user.id)
    .order('completed_at', { ascending: false })

  if (error) {
    return {
      data: readLocalCompletions(),
      error: error as Error,
    }
  }

  return {
    data: ((data as AcademyCompletion[] | null) ?? []),
    error: null as Error | null,
  }
}

function readLocalCompletions() {
  if (typeof window === 'undefined') return [] as AcademyCompletion[]
  try {
    const raw = window.localStorage.getItem(LOCAL_COMPLETION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as AcademyCompletion[]
  } catch {
    return []
  }
}

function writeLocalCompletions(rows: AcademyCompletion[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_COMPLETION_KEY, JSON.stringify(rows.slice(0, 20)))
}

export async function saveAcademyCompletion(input: { experienceKey: string; track: AcademyTrack; confidenceLabel?: string | null }) {
  const payload: AcademyCompletion = {
    experience_key: input.experienceKey,
    track: input.track,
    completed_at: new Date().toISOString(),
    confidence_label: input.confidenceLabel ?? null,
  }

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    const local = readLocalCompletions()
    const deduped = [payload, ...local.filter((row) => row.experience_key !== payload.experience_key)]
    writeLocalCompletions(deduped)
    return { error: null as Error | null }
  }

  const { error } = await supabase
    .from('academy_completions')
    .upsert(
      {
        user_id: authData.user.id,
        experience_key: payload.experience_key,
        track: payload.track,
        completed_at: payload.completed_at,
        confidence_label: payload.confidence_label,
      },
      { onConflict: 'user_id,experience_key' },
    )

  if (error) {
    const local = readLocalCompletions()
    const deduped = [payload, ...local.filter((row) => row.experience_key !== payload.experience_key)]
    writeLocalCompletions(deduped)
    return { error: error as Error }
  }

  return { error: null as Error | null }
}

export function computeAcademyProgress(rows: AcademyCompletion[]) {
  const scoutAvailable = academyExperiences.filter((item) => item.track === 'scout' && item.status === 'available')
  const refereeAvailable = academyExperiences.filter((item) => item.track === 'referee' && item.status === 'available')
  const completed = new Set(rows.map((row) => row.experience_key))

  const scoutDone = scoutAvailable.filter((item) => completed.has(item.key)).length
  const refereeDone = refereeAvailable.filter((item) => completed.has(item.key)).length

  return {
    scout: {
      completed: scoutDone,
      total: scoutAvailable.length,
      percent: scoutAvailable.length === 0 ? 0 : Math.round((scoutDone / scoutAvailable.length) * 100),
    },
    referee: {
      completed: refereeDone,
      total: refereeAvailable.length,
      percent: refereeAvailable.length === 0 ? 0 : Math.round((refereeDone / refereeAvailable.length) * 100),
    },
  }
}
