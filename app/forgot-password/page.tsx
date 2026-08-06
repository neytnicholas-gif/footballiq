'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { supabase } from '@/lib/supabase'
import { requestPasswordReset, shouldBlockDoubleSubmission } from '@/lib/signup-form'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'neutral' | 'error'>('neutral')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (shouldBlockDoubleSubmission(loading)) {
      return
    }

    setLoading(true)
    const result = await requestPasswordReset(supabase.auth, email, window.location.origin)
    setLoading(false)
    setMessage(result.message)
    setMessageTone(result.tone)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SurfaceCard className="p-6 sm:p-8">
          <Logo />
          <div className="mt-6">
            <StatusBadge label="Account recovery" tone="info" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Reset your password</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Enter your email and we will send a reset link if recovery is available for that account.</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Recovery links are time-limited</li>
            <li>• Use the latest link if you requested more than once</li>
            <li>• You can return to sign in anytime</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Recovery request</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Forgot password</h2>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Email
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>

            {message ? (
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
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? 'Requesting…' : 'Send reset link'}
              <Mail className="size-4" />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
            <Link href="/signup" className="font-semibold text-primary hover:underline">Create account</Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">You can only reset passwords for accounts that have completed signup.</p>
        </SurfaceCard>
      </div>
    </main>
  )
}
