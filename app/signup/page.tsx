'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function signUpWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      'Account created. Check your email to confirm your account, then sign in.'
    )

    setTimeout(() => router.push('/login'), 1200)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Join FootballIQ
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Create an account first. Then you will choose a public username for
            leaderboards.
          </p>

          <form onSubmit={signUpWithEmail} className="mt-6 space-y-4">
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
                minLength={6}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/40 focus:ring-2"
                placeholder="Minimum 6 characters"
              />
            </label>

            {message && (
              <p className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}