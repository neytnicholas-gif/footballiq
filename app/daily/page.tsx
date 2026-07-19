"use client"

import { useMemo, useState } from 'react'
import { CalendarDays, Copy, Flame, Gift } from 'lucide-react'
import { ModePage } from '@/components/mode-page'
import { DailyChallenge } from '@/components/daily-challenge'
import { useAuth } from '@/components/auth-provider'

export default function DailyPage() {
  const { user, profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const completed = profile?.last_activity_date?.slice(0, 10) === today

  async function share() {
    if (!completed) return
    const text = `FootballIQ Daily Challenge\nDate: ${today}\nStatus: Completed\nStreak: ${profile?.streak ?? 0} days\nPlay: ${window.location.origin}/daily`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <ModePage
      theme="daily"
      eyebrow="One day • one run • full focus"
      title="Today’s FootballIQ"
      description="Five questions per day. Complete today’s run to protect your streak and collect daily XP."
    >
      <section className="mb-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Daily challenge</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{new Date(today).toDateString()}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete the daily set once to record progress for today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void share()}
            disabled={!completed}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Copy className="size-4" /> {copied ? 'Copied' : 'Share result'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DailyStat icon={<CalendarDays className="size-4" />} label="Status" value={completed ? 'Completed today' : 'Not completed'} />
          <DailyStat icon={<Gift className="size-4" />} label="Reward" value="XP + rating" />
          <DailyStat icon={<Flame className="size-4" />} label="Current streak" value={`${profile?.current_streak ?? 0} days`} />
          <DailyStat icon={<Flame className="size-4" />} label="Longest streak" value={`${profile?.longest_streak ?? 0} days`} />
        </div>

        {!user && (
          <p className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            You can play while signed out, but streaks and progress are only saved when you are signed in.
          </p>
        )}
      </section>
      <DailyChallenge />
    </ModePage>
  )
}

function DailyStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  )
}