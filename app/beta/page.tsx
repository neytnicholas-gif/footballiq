'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle2, Gift, MessageSquareText, ShieldCheck, Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SurfaceCard } from '@/components/platform/primitives'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { BRAND } from '@/lib/brand'

type BetaStatus = {
  joined: boolean
  joined_at: string | null
  reward_status: 'eligible' | 'redeemed' | 'revoked' | null
  promised_months: number
  terms_version: string
  enrollment_open: boolean
}

const initialStatus: BetaStatus = {
  joined: false,
  joined_at: null,
  reward_status: null,
  promised_months: 12,
  terms_version: 'founder-beta-v1',
  enrollment_open: true,
}

export default function BetaPage() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<BetaStatus>(initialStatus)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true

    void supabase.rpc('beta_my_status').then(({ data, error: statusError }) => {
      if (!active) return
      if (statusError) setError('We could not confirm your beta status. Please try again shortly.')
      else setStatus({ ...initialStatus, ...(data as Partial<BetaStatus>) })
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [user])

  async function joinBeta() {
    if (!user || joining) return
    setJoining(true)
    setError('')
    const { data, error: joinError } = await supabase.rpc('beta_join', { p_source: 'beta-page' })
    if (joinError) setError(joinError.message.includes('BETA_ENROLLMENT_CLOSED') ? 'Founder beta enrollment has closed.' : 'Enrollment did not complete. Nothing was charged—please try again.')
    else setStatus({ ...initialStatus, ...(data as Partial<BetaStatus>), enrollment_open: true })
    setJoining(false)
  }

  const feedbackHref = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent('Early Shout beta feedback')}&body=${encodeURIComponent('Page or feature:\n\nWhat happened:\n\nWhat did you expect:\n\nDevice/browser:\n\nAnything you especially liked:')}`

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden">
          <div className="bg-[linear-gradient(135deg,rgba(16,185,129,.2),rgba(59,130,246,.13),rgba(8,14,26,.97))] p-7 text-white sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200"><Users className="size-4" /> Founder beta</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Help shape Early Shout before the paid launch.</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">Play the quizzes and Player Market free, report what feels brilliant or broken, and build the first real Early Shout community.</p>
          </div>
        </SurfaceCard>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <SurfaceCard className="p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Founder benefit</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight"><Gift className="size-6 text-primary" /> Twelve months on us</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Join with your Early Shout account during the founder beta. If paid Player Market access launches, your account will receive its first 12 months free. There is no payment, card request or automatic renewal today.</p>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> Enrollment is recorded against your account.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> The benefit is non-transferable and has no cash value.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> Fair-play and beta terms continue to apply.</li>
            </ul>

            <div className="mt-6" aria-live="polite">
              {authLoading || (Boolean(user) && loading) ? <p className="text-sm text-muted-foreground">Checking beta status…</p> : !user ? (
                <div className="flex flex-wrap gap-3">
                  <Link href="/signup" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Create account and join</Link>
                  <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">Sign in</Link>
                </div>
              ) : status.joined ? (
                <div className="rounded-xl border border-emerald-300/35 bg-emerald-300/10 p-4">
                  <p className="font-semibold text-foreground">You are registered as a founder beta player.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your {status.promised_months}-month benefit is attached to this account.</p>
                </div>
              ) : status.enrollment_open ? (
                <button type="button" onClick={() => void joinBeta()} disabled={joining} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{joining ? 'Joining…' : 'Join the founder beta'}</button>
              ) : <p className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">Founder beta enrollment is closed.</p>}
              {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </SurfaceCard>

          <div className="grid gap-5">
            <SurfaceCard className="p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><MessageSquareText className="size-4" /> Your role</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Play honestly. Tell us everything.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Build an 11-player team, play the free games and come back after prices change. Tell us if anything is confusing, slow or unfair.</p>
              <a href={feedbackHref} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40">Send beta feedback</a>
            </SurfaceCard>

            <SurfaceCard className="p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ShieldCheck className="size-4" /> Beta reality</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Features, rules and values can change while testing. Market Credits are free game credits with no cash value. Early Shout is independent and is not affiliated with any league, club, player or data provider.</p>
              <Link href="/terms" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Read beta terms</Link>
            </SurfaceCard>
          </div>
        </div>
      </section>
    </main>
  )
}
