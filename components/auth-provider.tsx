'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'
import { resolveEffectiveMembership, type Membership } from '@/lib/membership'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  membership: Membership
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_COLUMNS =
  'id, username, plan, subscription_status, trial_ends_at, subscription_started_at, subscription_expires_at, rating, xp, streak, quizzes_completed, correct_answers, total_answers, perfect_quizzes, current_streak, longest_streak, last_activity_date, created_at, updated_at'

const PROFILE_COLUMNS_LEGACY =
  'id, username, rating, xp, streak, quizzes_completed, correct_answers, total_answers, perfect_quizzes, current_streak, longest_streak, last_activity_date, created_at, updated_at'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    let data: Partial<Profile> | null
    let error: Error | null

    {
      const result = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      data = result.data as Partial<Profile> | null
      error = result.error as Error | null
    }

    if (error && error.message.toLowerCase().includes('column')) {
      const legacy = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS_LEGACY)
        .eq('id', userId)
        .maybeSingle()

      data = legacy.data as Partial<Profile> | null
      error = legacy.error
    }

    if (error) {
      console.error('Profile load error:', error.message)
      setProfile(null)
      return
    }

    if (!data) {
      setProfile(null)
      return
    }

    const source = data as Partial<Profile>
    const resolved = {
      ...source,
      plan: source.plan ?? 'free',
      subscription_status: source.subscription_status ?? 'inactive',
      trial_ends_at: source.trial_ends_at ?? null,
      subscription_started_at: source.subscription_started_at ?? null,
      subscription_expires_at: source.subscription_expires_at ?? null,
    } as Profile

    setProfile(resolved)
  }, [])

  const refreshProfile = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session
    setSession(currentSession)
    if (currentSession?.user) await loadProfile(currentSession.user.id)
    else setProfile(null)
    setLoading(false)
  }, [loadProfile])

  useEffect(() => {
    let mounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      setLoading(false)
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        setLoading(true)
        setSession(nextSession)
        if (nextSession?.user) await loadProfile(nextSession.user.id)
        else setProfile(null)
        setLoading(false)
      })()
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      membership: resolveEffectiveMembership(profile),
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
