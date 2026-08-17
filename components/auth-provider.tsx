'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'
import { resolveEffectiveMembership, type Membership } from '@/lib/membership'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  membership: Membership
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_COLUMNS =
  'id, username, plan, subscription_status, trial_ends_at, subscription_started_at, subscription_expires_at, rating, xp, streak, quizzes_completed, correct_answers, total_answers, perfect_quizzes, current_streak, longest_streak, last_activity_date, onboarding_version, onboarding_completed_at, created_at, updated_at'

const PROFILE_COLUMNS_LEGACY =
  'id, username, rating, xp, streak, quizzes_completed, correct_answers, total_answers, perfect_quizzes, current_streak, longest_streak, last_activity_date, created_at, updated_at'

const marketImportAttempts = new Set<string>()

async function importGuestMarketOnce(userId: string) {
  if (marketImportAttempts.has(userId)) return
  marketImportAttempts.add(userId)
  const { importAnonymousMarketStateToAccount } = await import('@/lib/market/client')
  const { error } = await importAnonymousMarketStateToAccount()
  if (error) {
    marketImportAttempts.delete(userId)
    console.warn('Guest Market import deferred:', error.message)
  }
}

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
      return null
    }

    if (!data) {
      setProfile(null)
      return null
    }

    const source = data as Partial<Profile>
    const resolved = {
      ...source,
      plan: source.plan ?? 'free',
      subscription_status: source.subscription_status ?? 'inactive',
      trial_ends_at: source.trial_ends_at ?? null,
      subscription_started_at: source.subscription_started_at ?? null,
      subscription_expires_at: source.subscription_expires_at ?? null,
      onboarding_version: source.onboarding_version ?? 0,
      onboarding_completed_at: source.onboarding_completed_at ?? null,
    } as Profile

    setProfile(resolved)
    return resolved
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
      if (data.session?.user) {
        setProfileLoading(true)
        await loadProfile(data.session.user.id)
        await importGuestMarketOnce(data.session.user.id)
        if (!mounted) return
        setSession(data.session)
        setProfileLoading(false)
      } else {
        setSession(null)
        setProfile(null)
        setProfileLoading(false)
      }
      setLoading(false)
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = sessionRef.current?.user?.id
      if (nextSession?.user) {
        // Publish the refreshed session before profile hydration. Protected routes
        // must never observe `loading: false` with a temporarily missing user.
        setSession(nextSession)
        setProfileLoading(true)
        const currentUserId = nextSession.user.id
        const canKeepCurrentProfile =
          previousUserId === currentUserId && profileRef.current?.id === currentUserId
        if (!canKeepCurrentProfile) {
          setProfile(null)
        }
        void (async () => {
          await loadProfile(currentUserId)
          await importGuestMarketOnce(currentUserId)
          if (mounted) {
            setProfileLoading(false)
          }
        })()
      } else {
        setSession(null)
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
      membership: resolveEffectiveMembership(profile),
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
