'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/logo'
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
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Join FootballIQ</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1>
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block text-sm font-medium">Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            {message && <p className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">{message}</p>}
            {!success && <button disabled={loading} className="h-11 w-full rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60">{loading ? 'Creating…' : 'Create account'}</button>}
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-medium text-primary hover:underline">Go to sign in</Link></p>
        </div>
      </div>
    </main>
  )
}
