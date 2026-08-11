'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Award, Check, Coins, Eye, Gift, LockKeyhole, Palette, Repeat2, Shield, Sparkles, Star, Target, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import {
  equipMarketReward,
  loadMyMarketProgression,
  purchaseMarketReward,
  setMarketFormation,
  setMarketShowcaseBadges,
  updateMarketProfilePreferences,
} from '@/lib/market/client'
import { challengePercent, EMPTY_MARKET_PROGRESSION, rewardItemUnlocked, type MarketProgression } from '@/lib/market/progression'

const icons = { Award, Eye, Gift, Repeat2, Shield, Sparkles, Star, Target, Trophy, Users }

export function MarketProgressionHub() {
  const { user, profile } = useAuth()
  const [progression, setProgression] = useState<MarketProgression>(EMPTY_MARKET_PROGRESSION)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await loadMyMarketProgression(true)
    setProgression(result.data)
    setError(result.error?.message ?? '')
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timer)
  }, [reload, user])

  const completed = progression.challenges.filter((challenge) => challenge.completed_at)
  const showcased = useMemo(() => completed.filter((challenge) => challenge.showcased).sort((a, b) => (a.showcased_order ?? 9) - (b.showcased_order ?? 9)), [completed])
  const equipped = new Set([
    progression.preferences.active_background,
    progression.preferences.active_avatar,
    progression.preferences.active_frame,
    progression.preferences.active_formation === '3-4-3' ? 'formation_343' : null,
  ].filter(Boolean))

  async function act(key: string, action: () => Promise<{ error: Error | null }>, success: string) {
    setBusy(key); setMessage(''); setError('')
    const result = await action()
    if (result.error) setError(result.error.message)
    else { setMessage(success); await reload() }
    setBusy('')
  }

  async function toggleShowcase(key: string) {
    const selected = showcased.map((badge) => badge.challenge_key)
    const next = selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key].slice(-3)
    await act(`badge:${key}`, () => setMarketShowcaseBadges(next), 'Your badge cabinet is updated.')
  }

  if (!user) return (
    <section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10">
      <Gift className="size-9 text-primary" />
      <h1 className="mt-4 text-4xl font-black tracking-tight">Challenges and rewards</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Sign in to earn badges, collect reward credits and make your public player profile your own.</p>
      <Link href="/signup" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Create your player profile</Link>
    </section>
  )

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.25),transparent_40%),linear-gradient(135deg,#10251f,#17372e)] p-7 text-white shadow-xl sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">Your market journey</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Play. Achieve. Make it yours.</h1>
          <p className="mt-3 text-sm text-emerald-50/80">Real trades unlock challenges. Challenges earn Style Credits. Style Credits buy permanent profile rewards. They never use your team budget.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-2 text-emerald-200"><Coins className="size-5"/><span className="text-xs font-bold uppercase tracking-wider">Style Credits</span></div>
          <p className="mt-2 text-4xl font-black">{progression.wallet.balance.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-50/65">Earned {progression.wallet.lifetime_earned} · Spent {progression.wallet.lifetime_spent}</p>
        </div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <DarkMetric label="Badges earned" value={`${completed.length}/${progression.challenges.length}`} />
        <DarkMetric label="Market trades" value={String(progression.trade_count)} />
        <DarkMetric label="Gameweek Reveals" value={String(progression.reveal_count)} />
      </div>
    </section>

    {message ? <p role="status" className="rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">{message}</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
    {loading ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Checking your latest progress…</p> : null}

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Challenge board</p><h2 className="mt-2 text-3xl font-black">Things to do next</h2></div>
        <p className="text-sm text-muted-foreground">Rewards are checked from real account activity.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {progression.challenges.map((challenge) => {
          const Icon = icons[challenge.icon_key as keyof typeof icons] ?? Award
          const done = Boolean(challenge.completed_at)
          return <article key={challenge.challenge_key} className={`rounded-2xl border p-5 ${done ? 'border-emerald-500/30 bg-emerald-50/70' : 'border-border bg-background/70'}`}>
            <div className="flex items-start justify-between gap-3"><span className={`rounded-xl p-2.5 ${done ? 'bg-emerald-600 text-white' : 'bg-secondary text-foreground'}`}><Icon className="size-5"/></span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold">+{challenge.reward_credits}</span></div>
            <h3 className="mt-4 text-lg font-black">{challenge.title}</h3><p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${challengePercent(challenge)}%`}} /></div>
            <div className="mt-2 flex justify-between text-xs"><span>{Math.min(challenge.progress,challenge.target).toLocaleString()} / {challenge.target.toLocaleString()}</span><span className="font-bold">{done ? `Badge: ${challenge.badge_name}` : 'In progress'}</span></div>
            {done ? <button disabled={Boolean(busy)} onClick={() => void toggleShowcase(challenge.challenge_key)} className="mt-4 min-h-11 w-full rounded-xl border border-emerald-700/25 bg-white px-3 py-2 text-sm font-bold text-emerald-950 disabled:opacity-50">{challenge.showcased ? 'Remove from profile' : showcased.length >= 3 ? 'Show this instead' : 'Show on my profile'}</button> : null}
          </article>
        })}
      </div>
    </section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Reward shop</p><h2 className="mt-2 text-3xl font-black">Permanent ways to stand out</h2><p className="mt-2 text-sm text-muted-foreground">The shop opens item by item as you trade and return for Reveals. Nothing here can be bought with real money.</p></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {progression.store.map((item) => {
          const unlocked = rewardItemUnlocked(item, progression)
          const isEquipped = equipped.has(item.item_key)
          return <article key={item.item_key} className="relative overflow-hidden rounded-2xl border border-border bg-background/70 p-5">
            <div className="flex items-start justify-between"><span className="rounded-xl bg-secondary p-2.5"><Palette className="size-5"/></span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold">{item.price_credits} credits</span></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">{item.item_type}</p><h3 className="mt-1 text-lg font-black">{item.name}</h3><p className="mt-1 min-h-10 text-sm text-muted-foreground">{item.description}</p>
            <p className="mt-4 text-xs text-muted-foreground">Needs {item.required_trades} trades · {item.required_reveals} Reveal{item.required_reveals===1?'':'s'}</p>
            {item.owned ? <button disabled={isEquipped || Boolean(busy)} onClick={() => void act(`equip:${item.item_key}`, () => item.item_type === 'formation' ? setMarketFormation('3-4-3') : equipMarketReward(item.item_key), `${item.name} is now active.`)} className="mt-4 min-h-11 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-55">{isEquipped ? <><Check className="mr-1 inline size-4"/>Active</> : 'Use this reward'}</button>
            : <button disabled={!unlocked || progression.wallet.balance<item.price_credits || Boolean(busy)} onClick={() => void act(`buy:${item.item_key}`, () => purchaseMarketReward(item.item_key), `${item.name} is yours forever.`)} className="mt-4 min-h-11 w-full rounded-xl bg-foreground px-3 py-2 text-sm font-bold text-background disabled:opacity-45">{!unlocked ? <><LockKeyhole className="mr-1 inline size-4"/>Locked</> : progression.wallet.balance<item.price_credits ? 'Earn more credits' : 'Unlock forever'}</button>}
          </article>
        })}
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Public profile</p><h2 className="mt-2 text-2xl font-black">You choose what people see</h2><p className="mt-2 text-sm text-muted-foreground">Your username and current roster stay public so the game is fair. Everything below is your choice.</p>
        <div className="mt-5 space-y-3">
          <PrivacyToggle label="Show my badges" checked={progression.preferences.show_badges} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_badges:value}}))}/>
          <PrivacyToggle label="Show my market stats" checked={progression.preferences.show_market_stats} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_market_stats:value}}))}/>
          <PrivacyToggle label="Show recent activity" checked={progression.preferences.show_activity} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_activity:value}}))}/>
        </div>
        <button disabled={Boolean(busy)} onClick={() => void act('privacy',()=>updateMarketProfilePreferences(progression.preferences),'Your profile privacy choices are saved.')} className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Save choices</button>
      </div>
      <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Badge cabinet</p><h2 className="mt-2 text-2xl font-black">Your chosen three</h2><p className="mt-2 text-sm text-muted-foreground">Pick up to three earned badges for the top of your public profile.</p>
        <div className="mt-5 flex flex-wrap gap-3">{showcased.length ? showcased.map((badge)=><span key={badge.challenge_key} className="rounded-xl border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm font-black text-amber-950">🏅 {badge.badge_name}</span>) : <p className="text-sm text-muted-foreground">Complete a challenge, then choose “Show on my profile”.</p>}</div>
        {profile?.username ? <Link href={`/player/${encodeURIComponent(profile.username)}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2 text-sm font-bold">View my public profile</Link> : null}
      </div>
    </section>
  </div>
}

function DarkMetric({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs text-emerald-50/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div> }
function PrivacyToggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}) { return <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)} className="size-5 accent-emerald-600"/></label> }
