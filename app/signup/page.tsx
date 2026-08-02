'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { supabase } from '@/lib/supabase'
import { getPasswordMismatchMessage, getSignupSuccessMessage, togglePasswordVisibility } from '@/lib/signup-form'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [success, setSuccess] = useState(false)

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const mismatchMessage = getPasswordMismatchMessage(password, confirmPassword)
    if (mismatchMessage) {
      setPasswordError(mismatchMessage)
      setMessage('')
      return
    }

    setLoading(true)
    setMessage('')
    setPasswordError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setSuccess(false)
      return setMessage(error.message)
    }
    setSuccess(true)
    setMessage(getSignupSuccessMessage(Boolean(data.session)))
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
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Join FootballIQ</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1>
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email<input name="email" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block text-sm font-medium">
              Password
              <div className="relative mt-2">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(togglePasswordVisibility)}
                  className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium">
              Confirm password
              <div className="relative mt-2">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  required
                  aria-describedby={passwordError ? 'confirm-password-error' : undefined}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-20 outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  aria-pressed={showConfirmPassword}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(togglePasswordVisibility)}
                  className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {passwordError && <p id="confirm-password-error" role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</p>}
            {message && <p role="status" aria-live="polite" className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">{message}</p>}
            {!success && <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60">{loading ? 'Creating…' : 'Create account'}</button>}
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-medium text-primary hover:underline">Go to sign in</Link></p>
        </div>
      </div>
    </main>
  )
}
