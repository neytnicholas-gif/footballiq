import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.warn('Missing Supabase environment variables. Auth will not work until they are added.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    },
  },
)

export type Profile = {
  id: string
  username: string | null
  rating: number
  xp: number
  streak: number
  quizzes_completed: number
  correct_answers: number
  total_answers: number
  perfect_quizzes: number
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  created_at: string
  updated_at: string
}
