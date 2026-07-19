'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

const clean = (value: string) => value.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)

export default function UsernamePage() {
  const router = useRouter()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && profile?.username) setUsername(profile.username)
  }, [loading, user, profile, router])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    const value = clean(username)
    if (value.length < 3) return setMessage('Username must be at least 3 characters.')
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('profiles').upsert(
      { id: user.id, username: value },
      { onConflict: 'id' },
    )
    setSaving(false)
    if (error) return setMessage(error.code === '23505' ? 'That username is already taken.' : error.message)
    await refreshProfile()
    router.replace('/')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md"><Logo />
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">One final step</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your username</h1>
          <p className="mt-3 text-sm text-muted-foreground">Letters, numbers and underscores only.</p>
          <form onSubmit={save} className="mt-6 space-y-4">
            <input value={username} onChange={(e) => setUsername(clean(e.target.value))} minLength={3} required placeholder="NicholasIQ" className="h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            {message && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
            <button disabled={saving || loading} className="h-11 w-full rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving…' : 'Save username'}</button>
          </form>
        </div>
      </div>
    </main>
  )
}
