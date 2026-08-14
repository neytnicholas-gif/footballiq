'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { TurnstileChallenge, TURNSTILE_SITE_KEY } from '@/components/auth/turnstile-challenge'
import { supabase } from '@/lib/supabase'
import {
  getCaptchaValidationMessage,
  getNewPasswordValidationMessage,
  getSignupErrorMessage,
  getSignupSuccessMessage,
  resendSignupConfirmation,
  shouldBlockDoubleSubmission,
  togglePasswordVisibility,
} from '@/lib/signup-form'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [passwordError, setPasswordError] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    const passwordMessage = getNewPasswordValidationMessage(password, confirmPassword)
    if (passwordMessage) {
      setPasswordError(passwordMessage)
      setMessage('')
      setMessageTone('error')
      return
    }

    const captchaMessage = getCaptchaValidationMessage(Boolean(TURNSTILE_SITE_KEY), captchaToken)
    if (captchaMessage) {
      setMessage(captchaMessage)
      setMessageTone('error')
      return
    }

    setLoading(true)
    setMessage('')
    setPasswordError('')
    setMessageTone('neutral')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    setLoading(false)
    if (error) {
      setCaptchaToken('')
      setCaptchaResetKey((value) => value + 1)
      const safeMessage = getSignupErrorMessage(error)
      setShowResend(safeMessage === getSignupSuccessMessage(false))
      setMessageTone(safeMessage === getSignupSuccessMessage(false) ? 'neutral' : 'error')
      setMessage(safeMessage)
      return
    }

    const hasSession = Boolean(data.session)
    setShowResend(!hasSession)
    setMessageTone(hasSession ? 'success' : 'neutral')
    setMessage(getSignupSuccessMessage(hasSession))
  }

  async function resendConfirmation() {
    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    setResendLoading(true)
    const result = await resendSignupConfirmation(supabase.auth, email, window.location.origin)
    setResendLoading(false)
    setMessage(result.message)
    setMessageTone(result.tone)
    setShowResend(true)
  }

  function onPasswordChange(value: string) {
    setPassword(value)
    setPasswordError('')
  }

  function onConfirmPasswordChange(value: string) {
    setConfirmPassword(value)
    setPasswordError('')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SurfaceCard className="p-6 sm:p-8">
          <Logo />
          <div className="mt-6">
            <StatusBadge label="Join Early Shout" tone="good" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Make your free Early Shout account.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Save your team, XP, scores and streak in one place.</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Free includes the full current core gameplay</li>
            <li>• Save runs and pick up where you left off</li>
            <li>• All current quizzes and Academy learning experiences are free</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Account setup</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Create your account</h2>
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">Email<input name="email" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
            <label className="block text-sm font-medium text-foreground">
              Password
              <div className="relative mt-2">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={10}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(togglePasswordVisibility)}
                  className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Confirm password
              <div className="relative mt-2">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={10}
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  required
                  aria-describedby={passwordError ? 'confirm-password-error' : undefined}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  aria-pressed={showConfirmPassword}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(togglePasswordVisibility)}
                  className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {passwordError && <p id="confirm-password-error" role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</p>}
            <p className="text-xs text-muted-foreground">Use at least 10 characters, including a letter and a number.</p>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/25 p-3 text-sm text-muted-foreground">
              <input name="legalAcknowledgement" type="checkbox" required className="mt-1 size-4 accent-emerald-500" />
              <span>I am at least 13, agree to the <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline">Terms of Use</Link>, and acknowledge the <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">Privacy Notice</Link>.</span>
            </label>
            <TurnstileChallenge onTokenChange={setCaptchaToken} resetKey={captchaResetKey} />
            {message && (
              <p
                role={messageTone === 'error' ? 'alert' : 'status'}
                aria-live={messageTone === 'error' ? 'assertive' : 'polite'}
                className={
                  messageTone === 'error'
                    ? 'rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive'
                    : messageTone === 'success'
                      ? 'rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-3 text-sm text-emerald-200'
                      : 'rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground'
                }
              >
                {message}
              </p>
            )}
            <button disabled={loading || resendLoading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">{loading ? 'Creating…' : 'Create account'}<ArrowRight className="size-4" /></button>
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
          <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-primary hover:underline">Go to sign in</Link></p>
        </SurfaceCard>
      </div>
    </main>
  )
}
