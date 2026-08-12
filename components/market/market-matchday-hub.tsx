'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock3, LockKeyhole, Sparkles, TriangleAlert } from 'lucide-react'
import type { MarketGameweekStatus } from '@/lib/market/types'

function remainingTime(target: string, now: number) {
  const milliseconds = Math.max(0, Date.parse(target) - now)
  const totalMinutes = Math.floor(milliseconds / 60_000)
  const days = Math.floor(totalMinutes / 1_440)
  const hours = Math.floor((totalMinutes % 1_440) / 60)
  const minutes = totalMinutes % 60
  if (milliseconds === 0) return 'Deadline reached'
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h ${minutes}m left`
}

export function MarketMatchdayHub({ status, hasFullTeam, latestRevealWeek }: { status: MarketGameweekStatus | null; hasFullTeam: boolean; latestRevealWeek: string | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const view = useMemo(() => {
    if (!status) return { title: 'The next gameweek is being prepared', copy: 'You can still build and check your team. We will show the next deadline here when it is ready.', action: '/market/roster', actionLabel: 'Check my roster', tone: 'waiting' as const }
    if (status.state === 'processing') return { title: 'Ratings are being checked', copy: 'Trading is paused while verified match ratings are processed. Your players and budget are safe.', action: '/market/roster', actionLabel: 'View my team', tone: 'processing' as const }
    if (status.state === 'revealed') return { title: 'Your new prices are ready', copy: `Open The Reveal to see who rose, who fell and why.`, action: '/market/reveal', actionLabel: 'Open The Reveal', tone: 'reveal' as const }
    if (status.state === 'failed') return { title: 'This update needs another check', copy: 'Trading stays protected while the update is reviewed. No player or budget change is being guessed.', action: '/market/roster', actionLabel: 'View my team', tone: 'problem' as const }
    if (status.state === 'closed') return { title: 'Trading is closed', copy: 'Your team is locked safely for the current update.', action: '/market/roster', actionLabel: 'View locked team', tone: 'processing' as const }
    if (!hasFullTeam) return { title: 'Finish your XI before the deadline', copy: `You have ${status.signings_remaining} of 11 signings left this gameweek.`, action: '/market/players', actionLabel: 'Finish my team', tone: 'open' as const }
    return { title: 'Your XI is ready', copy: `You have ${status.signings_remaining} of 11 signings left if you want to make a change.`, action: '/market/roster', actionLabel: 'Check my XI', tone: 'ready' as const }
  }, [hasFullTeam, status])

  const Icon = view.tone === 'reveal' ? Sparkles : view.tone === 'problem' ? TriangleAlert : view.tone === 'processing' ? LockKeyhole : view.tone === 'ready' ? CheckCircle2 : Clock3
  return <section aria-labelledby="matchday-title" className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-3xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-primary"><CalendarClock className="size-4" /> Matchday centre</p><h2 id="matchday-title" className="mt-2 text-3xl font-black tracking-tight">{view.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{view.copy}</p>{latestRevealWeek ? <p className="mt-2 text-xs font-semibold text-primary">Latest Reveal: {latestRevealWeek}</p> : null}</div>
      <div className="min-w-52 rounded-2xl border border-border bg-background/70 p-4"><p className="flex items-center gap-2 text-sm font-black"><Icon className="size-5 text-primary" />{status?.label ?? 'Next gameweek'}</p><p className="mt-2 text-2xl font-black" aria-live="polite">{status?.closes_at && now !== null ? remainingTime(status.closes_at, now) : 'Schedule pending'}</p><p className="mt-1 text-xs text-muted-foreground">{status?.state === 'open' ? 'Trading deadline' : `Status: ${status?.state ?? 'preparing'}`}</p></div>
    </div>
    <div className="mt-5 flex flex-wrap gap-3"><Link href={view.action} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">{view.actionLabel}</Link><Link href="/game-rules" className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-2.5 text-sm font-bold">How gameweeks work</Link></div>
  </section>
}
