'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

function cleanUsername(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
}

export default function UsernamePage() {
  const router = useRouter()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const isCreating = !profile?.username

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && profile?.username) setUsername(profile.username)
  }, [loading, user, profile, router])

  async function saveUsername(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const value = cleanUsername(username)
    setUsername(value)
    setMessage('')

    if (value.length < 3) {
      setMessage('Username must be at least 3 characters.')
      return
    }

    if (value.length > 20) {
      setMessage('Username must be 20 characters or less.')
      return
    }

    setSaving(true)

    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .neq('id', user.id)
      .maybeSingle()

    if (checkError) {
      setSaving(false)
      setMessage(checkError.message)
      return
    }

    if (existing) {
      setSaving(false)
      setMessage('That username is already taken.')
      return
    }

    const profileData = {
      id: user.id,
      username: value,
      rating: profile?.rating ?? 1000,
      xp: profile?.xp ?? 0,
      streak: profile?.streak ?? 0,
    } as ProfileInsert

    const { error } = await supabase.from('profiles').upsert(profileData)

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    await refreshProfile()

    // If creating username for first time, redirect to home
    // If editing existing username, show success message
    if (isCreating) {
      router.push('/')
    } else {
      setMessage('✓ Username updated successfully')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <Logo />

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {isCreating ? 'One final step' : 'Edit your username'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {isCreating ? 'Create your username' : 'Change your username'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is the name other players will see on leaderboards. Use letters, numbers or underscores only.
          </p>

          <form onSubmit={saveUsername} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(cleanUsername(event.target.value))}
                required
                minLength={3}
                maxLength={20}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/40 focus:ring-2"
                placeholder="YourUsername"
              />
            </label>

            {message && (
              <p className={`rounded-xl p-3 text-sm ${
                message.includes('success') || message.includes('successfully')
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'border border-destructive/30 bg-destructive/10 text-destructive'
              }`}>
                {message}
              </p>
            )}

            <Button type="submit" disabled={saving || loading} className="h-11 w-full rounded-xl glow-green">
              {saving ? 'Saving...' : isCreating ? 'Create username' : 'Update username'}
            </Button>
          </form>

          {!isCreating && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to home
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
