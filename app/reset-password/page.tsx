'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { supabase } from '@/lib/supabase'
import {
  getRecoverySessionErrorMessage,
  getResetPasswordValidationMessage,
  requestPasswordReset,
  shouldBlockDoubleSubmission,
  togglePasswordVisibility,
  updateAccountPassword,
} from '@/lib/signup-form'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [sessionChecking, setSessionChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [validationError, setValidationError] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [updateComplete, setUpdateComplete] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!active) {
        return
      }

      if (error) {
        setMessage(getRecoverySessionErrorMessage(error))
        setMessageTone('error')
        setHasRecoverySession(false)
        setSessionChecking(false)
        return
      }

      setHasRecoverySession(Boolean(data.session?.user))
      setRecoveryEmail(data.session?.user?.email ?? '')
      setSessionChecking(false)
      if (!data.session?.user) {
        setMessage('Your reset session is missing or expired. Request a new reset email.')
        setMessageTone('error')
      }
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return
      }

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setHasRecoverySession(Boolean(session?.user))
        setRecoveryEmail(session?.user?.email ?? '')
        if (session?.user) {
          setMessage('Reset session verified. Choose your new password.')
          setMessageTone('neutral')
        }
      }

      if (event === 'SIGNED_OUT') {
        setHasRecoverySession(false)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const canSubmit = useMemo(
    () => hasRecoverySession && !sessionChecking && !loading && !resendLoading && !updateComplete,
    [hasRecoverySession, sessionChecking, loading, resendLoading, updateComplete],
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    if (!hasRecoverySession) {
      setValidationError('Your reset session is missing or expired. Request a new reset email.')
      return
    }

    const validationMessage = getResetPasswordValidationMessage(password, confirmPassword)
    if (validationMessage) {
      setValidationError(validationMessage)
      return
    }

    setValidationError('')
    setLoading(true)
    const result = await updateAccountPassword(supabase.auth, password)
    setLoading(false)

    setMessage(result.message)
    setMessageTone(result.ok ? 'success' : 'error')
    setUpdateComplete(result.ok)
  }

  async function resendResetLink() {
    if (shouldBlockDoubleSubmission(loading) || shouldBlockDoubleSubmission(resendLoading)) {
      return
    }

    setResendLoading(true)
    const result = await requestPasswordReset(
      supabase.auth,
      recoveryEmail,
      window.location.origin,
    )
    setResendLoading(false)

    setMessage(result.message)
    setMessageTone(result.ok ? 'neutral' : 'error')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SurfaceCard className="p-6 sm:p-8">
          <Logo />
          <div className="mt-6">
            <StatusBadge label="Secure reset" tone="warn" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Choose a new password</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Use this page only from a valid recovery link. If your session expired, request a new reset email.</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Minimum 8 characters</li>
            <li>• Include at least one letter and one number</li>
            <li>• After reset, return to sign in with your new password</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Password reset</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Reset password</h2>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              New password
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setValidationError('')
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  disabled={!canSubmit}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(togglePasswordVisibility)}
                  disabled={!canSubmit}
                  className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Confirm new password
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setValidationError('')
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  disabled={!canSubmit}
                />
                <button
                  type="button"
                  aria-pressed={showConfirmPassword}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(togglePasswordVisibility)}
                  disabled={!canSubmit}
                  className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {validationError ? (
              <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{validationError}</p>
            ) : null}

            {message ? (
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
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update password'}
              <ArrowRight className="size-4" />
            </button>
          </form>

          {!updateComplete ? (
            <button
              type="button"
              onClick={() => void resendResetLink()}
              disabled={resendLoading || !recoveryEmail}
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/35 disabled:opacity-60"
            >
              {resendLoading ? 'Requesting…' : 'Request another reset link'}
            </button>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link href="/login" className="font-semibold text-primary hover:underline">Go to sign in</Link>
            <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password page</Link>
          </div>

          {sessionChecking ? <p className="mt-3 text-xs text-muted-foreground">Checking reset session…</p> : null}
        </SurfaceCard>
      </div>
    </main>
  )
}
