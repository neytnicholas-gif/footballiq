'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSuccess(true)
    setMessage(data.session ? 'Account created. You can continue now.' : 'Account created. Check your email to confirm it, then sign in.')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SurfaceCard className="p-6 sm:p-8">
          <Logo />
          <div className="mt-6">
            <StatusBadge label="Join FootballIQ" tone="good" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Build your football intelligence profile.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Create a free account to keep progression, ratings, streaks and completion history in one place.</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Free includes the full current core gameplay</li>
            <li>• Save runs and pick up where you left off</li>
            <li>• Pro modules are separate from the current sprint</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Account setup</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Create your account</h2>
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
            <label className="block text-sm font-medium text-foreground">Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
            {message && <p className="rounded-xl border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">{message}</p>}
            {!success && <button disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">{loading ? 'Creating…' : 'Create account'}<ArrowRight className="size-4" /></button>}
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-primary hover:underline">Go to sign in</Link></p>
        </SurfaceCard>
      </div>
    </main>
  )
}
