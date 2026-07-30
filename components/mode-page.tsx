import Link from 'next/link'
import { BarChart3, Flame, Radar, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { COMPETITIVE_MODE_IDS, type LeaderboardMode } from '@/lib/competitive'

export type ModeTheme = 'referee' | 'scout' | 'duels' | 'mystery' | 'career' | 'higher' | 'daily' | 'predictions'

const themeMeta: Record<ModeTheme, { label: string; icon: React.ElementType; className: string; leaderboard: LeaderboardMode | 'daily' }> = {
  referee: { label: 'Referee Arena', icon: ShieldCheck, className: 'mode-referee', leaderboard: COMPETITIVE_MODE_IDS.refereeDecisions },
  scout: { label: 'Scout Vision', icon: Radar, className: 'mode-scout', leaderboard: COMPETITIVE_MODE_IDS.scout },
  duels: { label: 'Football Duels', icon: Trophy, className: 'mode-duels', leaderboard: COMPETITIVE_MODE_IDS.footballDuels },
  mystery: { label: 'Who Am I?', icon: Sparkles, className: 'mode-mystery', leaderboard: COMPETITIVE_MODE_IDS.whoAmI },
  career: { label: 'Career Path', icon: BarChart3, className: 'mode-career', leaderboard: COMPETITIVE_MODE_IDS.careerPath },
  higher: { label: 'Higher or Lower', icon: Flame, className: 'mode-higher', leaderboard: COMPETITIVE_MODE_IDS.higherLower },
  daily: { label: 'Daily Challenge', icon: Flame, className: 'mode-daily', leaderboard: 'daily' },
  predictions: { label: 'Prediction Centre', icon: BarChart3, className: 'mode-predictions', leaderboard: COMPETITIVE_MODE_IDS.overall },
}

export function ModePage({ eyebrow, title, description, theme, children }: { eyebrow: string; title: string; description: string; theme: ModeTheme; children: React.ReactNode }) {
  const meta = themeMeta[theme]
  const Icon = meta.icon
  return <main className={`mode-shell min-h-screen ${meta.className}`}>
    <SiteHeader />
    <div className="mode-atmosphere" aria-hidden="true"><span/><span/><span/></div>
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="mode-hero overflow-hidden rounded-[2rem] border p-6 sm:p-9">
        <div className="mode-visual" aria-hidden="true">
          <div className="mode-pitch-lines"/><div className="mode-orb mode-orb-one"/><div className="mode-orb mode-orb-two"/>
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-7">
          <div className="max-w-3xl">
            <div className="mode-pill inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em]"><Icon className="size-4" /> {meta.label}</div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[.25em] text-white/55">{eyebrow}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/68 sm:text-lg">{description}</p>
          </div>
          <Link href={`/leaderboard?board=${meta.leaderboard}`} className="mode-action inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold transition hover:-translate-y-0.5">View mode ranking →</Link>
        </div>
      </div>
      <div className="mode-game mt-6 rounded-[2rem] border p-3 sm:p-5">{children}</div>
    </section>
  </main>
}
