'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMessage(error.message)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Welcome back</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to FootballIQ</h1>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="block text-sm font-medium">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" /></label>
            {message && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
            <button disabled={loading} className="h-11 w-full rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">No account yet? <Link href="/signup" className="font-medium text-primary hover:underline">Create one</Link></p>
        </div>
      </div>
    </main>
  )
}
