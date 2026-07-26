import type { Profile } from '@/lib/supabase'

export type MembershipPlan = 'free' | 'pro'
export type MembershipStatus = 'inactive' | 'trialing' | 'active' | 'expired' | 'cancelled'

export type Membership = {
  plan: MembershipPlan
  status: MembershipStatus
  trialActive: boolean
  startedAt: string | null
  expiresAt: string | null
  trialEndsAt: string | null
  source: 'profile' | 'dev-local-override'
}

const DEV_OVERRIDE_KEY = 'fiq-dev-pro-override'

function inDateRange(input: string | null) {
  if (!input) return false
  const timestamp = Date.parse(input)
  if (!Number.isFinite(timestamp)) return false
  return timestamp > Date.now()
}

export function resolveMembership(profile: Profile | null): Membership {
  const plan = profile?.plan === 'pro' ? 'pro' : 'free'
  const status = normalizeStatus(profile?.subscription_status)

  const trialActive = inDateRange(profile?.trial_ends_at ?? null)
  const activeSubscription = status === 'active' || status === 'trialing'
  const activeByDate = inDateRange(profile?.subscription_expires_at ?? null)

  const isPro = plan === 'pro' && (activeSubscription || trialActive || activeByDate)

  if (isPro) {
    return {
      plan: 'pro',
      status,
      trialActive,
      startedAt: profile?.subscription_started_at ?? null,
      expiresAt: profile?.subscription_expires_at ?? null,
      trialEndsAt: profile?.trial_ends_at ?? null,
      source: 'profile',
    }
  }

  return {
    plan: 'free',
    status,
    trialActive,
    startedAt: profile?.subscription_started_at ?? null,
    expiresAt: profile?.subscription_expires_at ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
    source: 'profile',
  }
}

function normalizeStatus(input: string | null | undefined): MembershipStatus {
  if (input === 'trialing' || input === 'active' || input === 'expired' || input === 'cancelled') return input
  return 'inactive'
}

export function isLocalDevHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export function getDevLocalProOverride() {
  if (process.env.NODE_ENV === 'production') return false
  if (!isLocalDevHost()) return false
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(DEV_OVERRIDE_KEY) === '1'
}

export function setDevLocalProOverride(enabled: boolean) {
  if (process.env.NODE_ENV === 'production') return
  if (!isLocalDevHost()) return
  if (typeof window === 'undefined') return
  if (enabled) {
    window.localStorage.setItem(DEV_OVERRIDE_KEY, '1')
  } else {
    window.localStorage.removeItem(DEV_OVERRIDE_KEY)
  }
}

export function resolveEffectiveMembership(profile: Profile | null): Membership {
  const base = resolveMembership(profile)
  if (base.plan === 'pro') return base

  if (getDevLocalProOverride()) {
    return {
      ...base,
      plan: 'pro',
      status: 'active',
      source: 'dev-local-override',
    }
  }

  return base
}

export function hasProAccess(membership: Membership | null) {
  return membership?.plan === 'pro'
}
