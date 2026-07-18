'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Welcome back
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Sign in to FootballIQ
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Save your rating, streak, username and future weekly challenge scores.
          </p>

          <form onSubmit={signInWithEmail} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/40 focus:ring-2"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/40 focus:ring-2"
                placeholder="Your password"
              />
            </label>

            {message && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl"
            >
              <Mail className="size-4" />
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            No account yet?{' '}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}