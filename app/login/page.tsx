'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { supabase } from '@/lib/supabase'
import { getLoginErrorState, resendSignupConfirmation, shouldBlockDoubleSubmission } from '@/lib/signup-form'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'neutral' | 'error'>('error')
  const [showResend, setShowResend] = useState(false)

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    setLoading(true)
    setMessage('')
    setShowResend(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      const mapped = getLoginErrorState(error)
      setMessage(mapped.message)
      setMessageTone(mapped.tone)
      setShowResend(mapped.canResend)
      return
    }
    router.replace('/')
    router.refresh()
  }

  async function resendConfirmation() {
    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    setResendLoading(true)
    const result = await resendSignupConfirmation(supabase.auth, email, window.location.origin)
    setResendLoading(false)
    setMessage(result.message)
    setMessageTone(result.tone === 'error' ? 'error' : 'neutral')
    setShowResend(true)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SurfaceCard className="p-6 sm:p-8">
          <Logo />
          <div className="mt-6">
            <StatusBadge label="Welcome back" tone="good" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sign in to FootballIQ</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Continue your progression across Scout Vision, Referee Arena, Football Duels and Daily Challenge.</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Keep your XP, ratings and streaks synced</li>
            <li>• Save unfinished runs and resume later</li>
            <li>• Unlock the profile and leaderboard experience</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Account access</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Sign in</h2>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
            <label className="block text-sm font-medium text-foreground">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link>
            </div>
            {message && (
              <p
                role={messageTone === 'error' ? 'alert' : 'status'}
                aria-live={messageTone === 'error' ? 'assertive' : 'polite'}
                className={
                  messageTone === 'error'
                    ? 'rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive'
                    : 'rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground'
                }
              >
                {message}
              </p>
            )}
            <button disabled={loading || resendLoading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}<ArrowRight className="size-4" /></button>
            {showResend && (
              <button
                type="button"
                onClick={() => void resendConfirmation()}
                disabled={loading || resendLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/35 disabled:opacity-60"
              >
                {resendLoading ? 'Resending…' : 'Resend confirmation email'}
              </button>
            )}
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">No account yet? <Link href="/signup" className="font-semibold text-primary hover:underline">Create one</Link></p>
          <p className="mt-2 text-center text-xs text-muted-foreground">Free play is available across the core modes. Pro is optional for future advanced modules.</p>
        </SurfaceCard>
      </div>
    </main>
  )
}
