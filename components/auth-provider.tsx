'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_COLUMNS =
  'id, username, rating, xp, streak, quizzes_completed, correct_answers, total_answers, perfect_quizzes, current_streak, longest_streak, last_activity_date, created_at, updated_at'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  const profileRef = useRef<Profile | null>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profile load error:', error.message)
      setProfile(null)
      return null
    }

    const nextProfile = (data as Profile | null) ?? null
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const refreshProfile = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session
    setSession(currentSession)
    if (currentSession?.user) {
      setProfileLoading(true)
      await loadProfile(currentSession.user.id)
      setProfileLoading(false)
    } else {
      setProfile(null)
      setProfileLoading(false)
    }
    setLoading(false)
  }, [loadProfile])

  useEffect(() => {
    let mounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        setProfileLoading(true)
        await loadProfile(data.session.user.id)
        if (!mounted) return
        setProfileLoading(false)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
      setLoading(false)
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = sessionRef.current?.user?.id
      setSession(nextSession)
      if (nextSession?.user) {
        setProfileLoading(true)
        const currentUserId = nextSession.user.id
        // Keep prior profile visible during same-user refresh to avoid auth-state flicker.
        const canKeepCurrentProfile =
          previousUserId === currentUserId && profileRef.current?.id === currentUserId
        if (!canKeepCurrentProfile) {
          setProfile(null)
        }
        void (async () => {
          await loadProfile(currentUserId)
          if (mounted) setProfileLoading(false)
        })()
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
      setLoading(false)
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
      loading,
      profileLoading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, profileLoading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
