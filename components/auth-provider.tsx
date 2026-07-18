'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
            id,
            username,
            rating,
            xp,
            quizzes_completed,
            correct_answers,
            total_answers,
            perfect_quizzes,
            current_streak,
            longest_streak,
            last_activity_date,
            created_at,
            updated_at
          `
        )
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Profile load error:', error)
        setProfile(null)
        return
      }

      setProfile(data as Profile | null)
    },
    [supabase]
  )

  const refreshProfile = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session refresh error:', error)
      setSession(null)
      setProfile(null)
      return
    }

    const currentSession = data.session

    setSession(currentSession)

    if (currentSession?.user) {
      await loadProfile(currentSession.user.id)
      return
    }

    setProfile(null)
  }, [supabase, loadProfile])

  useEffect(() => {
    let mounted = true

    async function initialiseAuth() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Initial session error:', error)
          setSession(null)
          setProfile(null)
          return
        }

        setSession(data.session)

        if (data.session?.user) {
          await loadProfile(data.session.user.id)
        } else {
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialiseAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)

      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      void loadProfile(nextSession.user.id).finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, loadProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return
    }

    setSession(null)
    setProfile(null)

    window.location.assign('/')
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}