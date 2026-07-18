import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the app from crashing during setup, but show a clear error in auth actions.
  console.warn('Missing Supabase environment variables. Add them to .env.local and Vercel.')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

export type Profile = {
  id: string
  username: string | null
  rating: number
  xp: number
  streak: number
  created_at?: string
}
