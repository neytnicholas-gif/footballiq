'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { getRankProgress } from '@/lib/progression'
import { supabase, type Profile } from '@/lib/supabase'
import { SectionHeader, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { ClubColourDot } from '@/components/market/club-colour-dot'
import type { Database } from '@/lib/supabase/types'
import { LevelProgress } from '@/components/level-progress'

type PublicProfile = Database['public']['Functions']['get_public_profiles']['Returns'][number]
type MarketPublicProfile = {
  preferences?: { show_badges: boolean; show_market_stats: boolean; show_roster: boolean; active_background: string | null; active_avatar: string | null; active_frame: string | null; active_title: string | null; active_formation: string }
  market_stats?: { total_account_value: number; realised_profit: number; trades: number } | null
  badges?: Array<{ key: string; name: string; title: string; icon_key: string }> | null
  roster?: Array<{ player_id: number; slug: string; name: string; club: string; position: string; value: number }> | null
}

function formatDays(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
}

export default function PublicPlayerPage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketProfile, setMarketProfile] = useState<MarketPublicProfile | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      let resolved: PublicProfile | null = null

      const { data } = await supabase.rpc('get_public_profiles', {
        p_user_ids: null,
        p_username: username,
      })

      resolved = ((data as PublicProfile[] | null) ?? [])[0] ?? null

      // Generated database types are updated after this migration reaches staging.
      // @ts-expect-error market_public_profile is introduced by the progression migration.
      const marketResult = await supabase.rpc('market_public_profile', { p_username: username })
      if (!marketResult.error && active) setMarketProfile(marketResult.data as MarketPublicProfile | null)

      if (!active) return
      setProfile((resolved as PublicProfile | null) as Profile | null)

      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [username])

  const rank = getRankProgress(profile?.xp ?? 0)
  const resolvedAccuracy = profile?.total_answers ? Math.round(profile.correct_answers / profile.total_answers * 100) : null
  const backgroundClass = marketProfile?.preferences?.active_background === 'bg_floodlights'
    ? 'bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,.28),transparent_32%),linear-gradient(135deg,#10231d,#174b3a)] text-white'
    : marketProfile?.preferences?.active_background === 'bg_tactical_grid'
      ? 'bg-[linear-gradient(rgba(16,185,129,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.08)_1px,transparent_1px),linear-gradient(135deg,#f5fbf8,#e8f5ef)] bg-[size:24px_24px]'
      : marketProfile?.preferences?.active_background === 'bg_trophy_wall'
        ? 'bg-[radial-gradient(circle_at_top,#f8d77b33,transparent_45%),linear-gradient(135deg,#231d10,#55431e)] text-white'
        : marketProfile?.preferences?.active_background === 'bg_press_box'
          ? 'bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]'
          : marketProfile?.preferences?.active_background === 'bg_derby_night'
            ? 'bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,.25),transparent_32%),linear-gradient(135deg,#081b16,#174b3a)] text-white'
            : marketProfile?.preferences?.active_background === 'bg_champions_tunnel'
              ? 'bg-[linear-gradient(120deg,#071d18_0%,#0f766e_48%,#f5c451_50%,#10251f_53%,#071d18_100%)] text-white'
              : marketProfile?.preferences?.active_background === 'bg_legend_gallery'
                ? 'bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,.42),transparent_42%),linear-gradient(135deg,#111827,#064e3b)] text-white'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(54,206,163,.16),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(56,123,255,.12),transparent_42%)]'
  const avatar = marketProfile?.preferences?.active_avatar === 'avatar_captain' ? 'C'
    : marketProfile?.preferences?.active_avatar === 'avatar_scout' ? '◎'
      : marketProfile?.preferences?.active_avatar === 'avatar_playmaker' ? '★' : profile?.username?.slice(0, 1).toUpperCase()
  const avatarFrame = marketProfile?.preferences?.active_frame === 'frame_rising' ? 'ring-4 ring-emerald-400'
    : marketProfile?.preferences?.active_frame === 'frame_clean_sheet' ? 'ring-4 ring-sky-400'
      : marketProfile?.preferences?.active_frame === 'frame_rookie' ? 'ring-4 ring-slate-300'
        : marketProfile?.preferences?.active_frame === 'frame_hot_streak' ? 'ring-4 ring-orange-400'
          : marketProfile?.preferences?.active_frame === 'frame_invincible' ? 'ring-4 ring-amber-400' : 'ring-2 ring-white/30'
  const resolvedAvatar = ({ avatar_keeper: 'GK', avatar_tactician: 'X', avatar_number_ten: '10', avatar_market_ace: 'A' } as Record<string,string>)[marketProfile?.preferences?.active_avatar ?? ''] ?? avatar
  const activeTitle = ({ title_early_adopter: 'Founder Beta', title_value_hunter: 'Value Hunter', title_market_mind: 'Market Mind', title_club_legend: 'Club Legend' } as Record<string,string>)[marketProfile?.preferences?.active_title ?? '']

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {loading ? <p className="text-muted-foreground">Loading player…</p> : !profile ? <SurfaceCard className="p-8"><h1 className="text-3xl font-black tracking-tight text-foreground">Player not found</h1><Link href="/leaderboard" className="mt-5 inline-block text-primary">Return to leaderboard →</Link></SurfaceCard> : <>
          <SurfaceCard className="overflow-hidden">
            <div className={`${backgroundClass} p-8 sm:p-10`}>
              <StatusBadge label="Public Early Shout profile" tone="good" />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className={`mb-4 grid size-16 place-items-center rounded-2xl bg-foreground text-2xl font-black text-background shadow-lg ${avatarFrame}`} aria-label="Player profile icon">{resolvedAvatar}</div>
                  <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">{profile.username}</h1>
                  {activeTitle ? <p className="mt-2 inline-flex rounded-full border border-amber-400/30 bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-950">{activeTitle}</p> : null}
                  <p className="mt-3 text-muted-foreground">Joined {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(profile.created_at))}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card/90 px-6 py-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{rank.current.emoji} {rank.current.title}</p>
                </div>
              </div>
              <LevelProgress xp={profile.xp} className="mt-8" />
              <div className="mt-5 rounded-2xl border border-border bg-card/75 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Rank milestone</p>
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
            <SectionHeader eyebrow="Profile snapshot" title="What this player has actually built" copy="XP, rating, streaks and accuracy all roll up from completed Early Shout runs." />
          </div>

          <SurfaceCard className="mt-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Public roster</p><h2 className="mt-2 text-2xl font-black">{marketProfile?.preferences?.active_formation ?? '4-3-3'} team</h2></div><span className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold"><Users className="mr-1 inline size-4"/>{marketProfile?.roster?.length ?? 0}/11</span></div>
            {marketProfile?.roster === null ? <p className="mt-5 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">This player has chosen to keep their roster private.</p> : !marketProfile?.roster?.length ? <p className="mt-5 text-sm text-muted-foreground">This player has not signed a market player yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{marketProfile.roster.map((player)=><Link key={player.player_id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="rounded-2xl border border-border bg-background/75 p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-black text-primary">{player.position}</span><span className="text-xs text-muted-foreground">{(player.value/1_000_000).toFixed(1)}m credits</span></div><p className="mt-3 flex min-w-0 items-center gap-2 font-black"><ClubColourDot clubName={player.club} /><span className="truncate">{player.name}</span></p><p className="truncate text-xs text-muted-foreground">{player.club}</p></Link>)}</div>}
          </SurfaceCard>

          {marketProfile?.market_stats ? <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Market account" value={`${(marketProfile.market_stats.total_account_value/1_000_000).toFixed(1)}m credits`} /><StatCard label="Realised game gain" value={`${(marketProfile.market_stats.realised_profit/1_000_000).toFixed(1)}m credits`} /><StatCard label="Trades" value={marketProfile.market_stats.trades.toLocaleString()} /></div> : null}

          <Link href="/leaderboard" className="mt-8 inline-flex rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">← Back to leaderboard</Link>
        </>}
      </section>
    </main>
  )
}
