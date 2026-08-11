'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { getRankProgress } from '@/lib/progression'
import { supabase, type Profile } from '@/lib/supabase'
import { SectionHeader, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import type { Database } from '@/lib/supabase/types'

type PublicProfile = Database['public']['Views']['public_leaderboard_profiles']['Row']
type MarketPublicProfile = {
  preferences?: { show_badges: boolean; show_market_stats: boolean; active_background: string | null; active_avatar: string | null; active_frame: string | null; active_formation: string }
  market_stats?: { total_account_value: number; realised_profit: number; trades: number } | null
  badges?: Array<{ key: string; name: string; title: string; icon_key: string }> | null
  roster?: Array<{ player_id: number; slug: string; name: string; club: string; position: string; value: number }>
}

function formatDays(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
}

export default function PublicPlayerPage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [marketProfile, setMarketProfile] = useState<MarketPublicProfile | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      let resolved: PublicProfile | null = null

      const { data, error } = await supabase
        .from('public_leaderboard_profiles')
        .select('id,username,rating,xp,quizzes_completed,correct_answers,total_answers,perfect_quizzes,current_streak,longest_streak,created_at')
        .eq('username', username)
        .maybeSingle()

      resolved = (data as PublicProfile | null) ?? null

      // Generated database types are updated after this migration reaches staging.
      // @ts-expect-error market_public_profile is introduced by the progression migration.
      const marketResult = await supabase.rpc('market_public_profile', { p_username: username })
      if (!marketResult.error && active) setMarketProfile(marketResult.data as MarketPublicProfile | null)

      if (error) {
        const fallback = await supabase
          .from('profiles')
          .select('id,username,rating,xp,quizzes_completed,correct_answers,total_answers,perfect_quizzes,current_streak,longest_streak,created_at')
          .eq('username', username)
          .maybeSingle()

        const fallbackData = fallback.data as (PublicProfile & { username: string | null }) | null
        resolved = fallbackData?.username ? (fallbackData as PublicProfile) : null
      }

      if (!active) return
      setProfile((resolved as PublicProfile | null) as Profile | null)

      if (resolved?.id) {
        const { data: results } = await supabase
          .from('quiz_results')
          .select('score,total')
          .eq('user_id', resolved.id)

        if (!active) return
        const totals = (results ?? []).reduce((accumulator, row) => {
          accumulator.correct += row.score
          accumulator.total += row.total
          return accumulator
        }, { correct: 0, total: 0 })
        setAccuracy(totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : null)
      }

      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [username])

  const rank = getRankProgress(profile?.xp ?? 0)
  const resolvedAccuracy = accuracy ?? (profile?.total_answers ? Math.round(profile.correct_answers / profile.total_answers * 100) : null)
  const backgroundClass = marketProfile?.preferences?.active_background === 'bg_floodlights'
    ? 'bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,.28),transparent_32%),linear-gradient(135deg,#10231d,#174b3a)] text-white'
    : marketProfile?.preferences?.active_background === 'bg_tactical_grid'
      ? 'bg-[linear-gradient(rgba(16,185,129,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.08)_1px,transparent_1px),linear-gradient(135deg,#f5fbf8,#e8f5ef)] bg-[size:24px_24px]'
      : marketProfile?.preferences?.active_background === 'bg_trophy_wall'
        ? 'bg-[radial-gradient(circle_at_top,#f8d77b33,transparent_45%),linear-gradient(135deg,#231d10,#55431e)] text-white'
        : 'bg-[radial-gradient(circle_at_top_left,rgba(54,206,163,.16),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(56,123,255,.12),transparent_42%)]'
  const avatar = marketProfile?.preferences?.active_avatar === 'avatar_captain' ? 'C'
    : marketProfile?.preferences?.active_avatar === 'avatar_scout' ? '◎'
      : marketProfile?.preferences?.active_avatar === 'avatar_playmaker' ? '★' : profile?.username?.slice(0, 1).toUpperCase()
  const avatarFrame = marketProfile?.preferences?.active_frame === 'frame_rising' ? 'ring-4 ring-emerald-400'
    : marketProfile?.preferences?.active_frame === 'frame_clean_sheet' ? 'ring-4 ring-sky-400' : 'ring-2 ring-white/30'

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {loading ? <p className="text-muted-foreground">Loading player…</p> : !profile ? <SurfaceCard className="p-8"><h1 className="text-3xl font-black tracking-tight text-foreground">Player not found</h1><Link href="/leaderboard" className="mt-5 inline-block text-primary">Return to leaderboard →</Link></SurfaceCard> : <>
          <SurfaceCard className="overflow-hidden">
            <div className={`${backgroundClass} p-8 sm:p-10`}>
              <StatusBadge label="Public FootballIQ profile" tone="good" />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className={`mb-4 grid size-16 place-items-center rounded-2xl bg-foreground text-2xl font-black text-background shadow-lg ${avatarFrame}`} aria-label="Player profile icon">{avatar}</div>
                  <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">{profile.username}</h1>
                  <p className="mt-3 text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card/90 px-6 py-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{rank.current.emoji} {rank.current.title}</p>
                </div>
              </div>
              <div className="mt-8">
                <div className="flex justify-between text-sm text-foreground"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank'}</span></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${rank.percent}%` }} /></div>
              </div>
              {marketProfile?.badges?.length ? <div className="mt-6 flex flex-wrap gap-2">{marketProfile.badges.map((badge)=><span key={badge.key} className="rounded-xl border border-amber-400/30 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950">🏅 {badge.name}</span>)}</div> : null}
            </div>
          </SurfaceCard>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Rating" value={profile.rating.toLocaleString()} />
            <StatCard label="Accuracy" value={resolvedAccuracy === null ? '—' : `${resolvedAccuracy}%`} hint={resolvedAccuracy === null ? 'No completed answers yet' : 'Derived from completed results'} />
            <StatCard label="Current streak" value={formatDays(profile.current_streak)} />
            <StatCard label="Longest streak" value={formatDays(profile.longest_streak)} />
            <StatCard label="Quizzes" value={profile.quizzes_completed.toLocaleString()} />
            <StatCard label="Perfect quizzes" value={profile.perfect_quizzes.toLocaleString()} />
          </div>

          <div className="mt-8">
            <SectionHeader eyebrow="Profile snapshot" title="What this player has actually built" copy="XP, rating, streaks and accuracy all roll up from completed FootballIQ runs." />
          </div>

          <SurfaceCard className="mt-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Public roster</p><h2 className="mt-2 text-2xl font-black">{marketProfile?.preferences?.active_formation ?? '4-3-3'} team</h2></div><span className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold"><Users className="mr-1 inline size-4"/>{marketProfile?.roster?.length ?? 0}/11</span></div>
            {!marketProfile?.roster?.length ? <p className="mt-5 text-sm text-muted-foreground">This player has not signed a market player yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{marketProfile.roster.map((player)=><Link key={player.player_id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="rounded-2xl border border-border bg-background/75 p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-black text-primary">{player.position}</span><span className="text-xs text-muted-foreground">{(player.value/1_000_000).toFixed(1)}m FIQ</span></div><p className="mt-3 truncate font-black">{player.name}</p><p className="truncate text-xs text-muted-foreground">{player.club}</p></Link>)}</div>}
          </SurfaceCard>

          {marketProfile?.market_stats ? <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Market account" value={`${(marketProfile.market_stats.total_account_value/1_000_000).toFixed(1)}m FIQ`} /><StatCard label="Realised game gain" value={`${(marketProfile.market_stats.realised_profit/1_000_000).toFixed(1)}m FIQ`} /><StatCard label="Trades" value={marketProfile.market_stats.trades.toLocaleString()} /></div> : null}

          <Link href="/leaderboard" className="mt-8 inline-flex rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">← Back to leaderboard</Link>
        </>}
      </section>
    </main>
  )
}
