import Link from 'next/link'
import { BarChart3, Flame, Radar, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StatCard, StatusBadge, SurfaceCard } from '@/components/platform/primitives'

export type ModeTheme = 'referee' | 'scout' | 'duels' | 'mystery' | 'career' | 'higher' | 'daily' | 'predictions'

const themeMeta: Record<ModeTheme, { label: string; icon: React.ElementType; className: string; leaderboard: string }> = {
  referee: { label: 'Referee Arena', icon: ShieldCheck, className: 'mode-referee', leaderboard: 'referee-decisions' },
  scout: { label: 'Scout Vision', icon: Radar, className: 'mode-scout', leaderboard: 'scout-mode' },
  duels: { label: 'Football Duels', icon: Trophy, className: 'mode-duels', leaderboard: 'football-duels' },
  mystery: { label: 'Who Am I?', icon: Sparkles, className: 'mode-mystery', leaderboard: 'who-am-i' },
  career: { label: 'Career Path', icon: BarChart3, className: 'mode-career', leaderboard: 'career-path' },
  higher: { label: 'Higher or Lower', icon: Flame, className: 'mode-higher', leaderboard: 'higher-lower' },
  daily: { label: 'Daily Challenge', icon: Flame, className: 'mode-daily', leaderboard: 'daily' },
  predictions: { label: 'Prediction Centre', icon: BarChart3, className: 'mode-predictions', leaderboard: 'overall' },
}

export function ModePage({ eyebrow, title, description, theme, children, compact = false }: { eyebrow: string; title: string; description: string; theme: ModeTheme; children: React.ReactNode; compact?: boolean }) {
  const meta = themeMeta[theme]
  return <main className={`mode-shell min-h-screen ${meta.className}`}>
    <SiteHeader />
    <div className="mode-atmosphere" aria-hidden="true"><span /><span /><span /></div>
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <SurfaceCard className={`mode-hero overflow-hidden p-6 sm:p-9 ${compact ? 'min-h-0' : ''}`}>
        <div className="mode-visual" aria-hidden="true">
          <div className="mode-pitch-lines" /><div className="mode-orb mode-orb-one" /><div className="mode-orb mode-orb-two" />
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-7">
          <div className="max-w-3xl">
            <StatusBadge label={meta.label} tone={theme === 'scout' ? 'good' : theme === 'referee' || theme === 'daily' ? 'warn' : theme === 'duels' || theme === 'career' ? 'info' : 'neutral'} />
            <p className={`mt-5 text-xs font-semibold uppercase tracking-[.28em] ${compact ? 'text-slate-400' : 'text-muted-foreground'}`}>{eyebrow}</p>
            <h1 className={`mt-2 font-black tracking-tight ${compact ? 'text-3xl text-slate-50 sm:text-5xl' : 'text-4xl text-foreground sm:text-6xl'}`}>{title}</h1>
            <p className={`mt-4 max-w-2xl text-base leading-relaxed sm:text-lg ${compact ? 'text-slate-300' : 'text-muted-foreground'}`}>{description}</p>
          </div>
          <Link href={`/leaderboard?board=${meta.leaderboard}`} className="mode-action inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/60">View ranking →</Link>
        </div>
      </SurfaceCard>
      {!compact ? <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Mode focus" value={meta.label} hint="One clear skill to train" />
        <StatCard label="Session style" value={theme === 'daily' ? 'Daily key' : theme === 'duels' ? 'Pack play' : theme === 'referee' ? 'Incident review' : 'Decision flow'} hint="Immediate feedback and replay" />
        <StatCard label="Progress link" value="Leaderboard" hint="Track rating and XP afterwards" />
      </div> : null}
      <div className="mode-game mt-5 rounded-[1.75rem] border p-2 sm:p-4">{children}</div>
    </section>
  </main>
}
