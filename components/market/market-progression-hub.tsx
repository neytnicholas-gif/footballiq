'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Award, CalendarDays, ChartNoAxesColumnIncreasing, Check, Coins,
  Crown, Eye, Gift, Globe2, Handshake, LockKeyhole, Medal, Palette, Repeat2,
  Shield, ShoppingBag, Sparkles, Swords, Target, Trophy, Users,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import {
  equipMarketReward, loadMyMarketProgression, purchaseMarketReward, setMarketFormation,
  setMarketShowcaseBadges, updateMarketProfilePreferences,
  setMarketRewardCelebrations,
} from '@/lib/market/client'
import {
  challengePercent, EMPTY_MARKET_PROGRESSION, rewardItemUnlocked,
  CLUBHOUSE_TIERS, clubhouseTierForBadges, clubhouseTierForItem,
  type MarketChallenge, type MarketProgression, type MarketRewardItem,
} from '@/lib/market/progression'

type ChallengeFilter = 'next' | 'all' | 'earned'
type StoreFilter = 'all' | 'style' | 'gameplay'

const iconByKey = {
  'shopping-bag': ShoppingBag,
  handshake: Handshake,
  users: Users,
  shield: Shield,
  'trending-up': ChartNoAxesColumnIncreasing,
  chart: ChartNoAxesColumnIncreasing,
  repeat: Repeat2,
  medal: Medal,
  eye: Eye,
  globe: Globe2,
  sparkles: Sparkles,
  calendar: CalendarDays,
  trophy: Trophy,
  crown: Crown,
  swords: Swords,
} as const

export function MarketProgressionHub() {
  const { user, profile } = useAuth()
  const [progression, setProgression] = useState<MarketProgression>(EMPTY_MARKET_PROGRESSION)
  const [filter, setFilter] = useState<ChallengeFilter>('next')
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await loadMyMarketProgression(true)
    setProgression(result.data)
    setError(result.error ? friendlyProgressionError(result.error.message) : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timer)
  }, [reload, user])

  const completed = useMemo(() => progression.challenges.filter((challenge) => challenge.completed_at), [progression.challenges])
  const currentTier = clubhouseTierForBadges(completed.length)
  const nextTier = CLUBHOUSE_TIERS.find((tier) => tier.badges > completed.length) ?? null
  const showcased = useMemo(() => completed.filter((challenge) => challenge.showcased).toSorted((a, b) => (a.showcased_order ?? 9) - (b.showcased_order ?? 9)), [completed])
  const closest = useMemo(() => progression.challenges.filter((challenge) => !challenge.completed_at).toSorted((a, b) => challengePercent(b) - challengePercent(a))[0] ?? null, [progression.challenges])
  const visibleChallenges = useMemo(() => {
    if (filter === 'earned') return completed
    if (filter === 'next') return progression.challenges.filter((challenge) => !challenge.completed_at)
    return progression.challenges
  }, [completed, filter, progression.challenges])
  const badgeLimit = progression.store.some((item) => item.item_key === 'utility_badge_cabinet' && item.owned) ? 5 : 3
  const visibleStore = useMemo(() => progression.store.filter((item) => {
    if (storeFilter === 'style') return ['background','avatar','frame','title'].includes(item.item_type)
    if (storeFilter === 'gameplay') return ['formation','utility','access'].includes(item.item_type)
    return true
  }), [progression.store, storeFilter])
  const equipped = useMemo(() => new Set([
    progression.preferences.active_background,
    progression.preferences.active_avatar,
    progression.preferences.active_frame,
    progression.preferences.active_title,
    progression.preferences.active_formation === '3-4-3' ? 'formation_343' : null,
  ].filter(Boolean)), [progression.preferences])

  async function act(key: string, action: () => Promise<{ error: Error | null }>, success: string) {
    setBusy(key); setMessage(''); setError('')
    const result = await action()
    if (result.error) setError(friendlyProgressionError(result.error.message))
    else { setMessage(success); await reload() }
    setBusy('')
  }

  async function toggleShowcase(key: string) {
    const selected = showcased.map((badge) => badge.challenge_key)
    const next = selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key].slice(-badgeLimit)
    await act(`badge:${key}`, () => setMarketShowcaseBadges(next), 'Your public badge cabinet has been updated.')
  }

  if (!user) return <SignedOutRewards />

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.28),transparent_42%),linear-gradient(135deg,#10251f,#17372e)] p-7 text-white shadow-xl sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">Challenges and badges</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Play the Market. Earn your story.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">Complete simple Market goals. Each completed goal gives you a badge and Style Credits. Use those credits on profile rewards that stay yours.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/market/players" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-emerald-950">Go to player market</Link>
            <Link href="/market/roster" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white">See my roster</Link>
            <Link href="/market/arena" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-bold text-amber-100">Enter the Arena</Link>
          </div>
        </div>
        <div className="min-w-56 rounded-2xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-2 text-emerald-200"><Coins className="size-5"/><span className="text-xs font-bold uppercase tracking-wider">Style Credits</span></div>
          <p className="mt-2 text-4xl font-black">{progression.wallet.balance.toLocaleString()}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-50/70">For rewards only. Your player-buying budget never changes.</p>
        </div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <DarkMetric label="Badges earned" value={`${completed.length} of ${progression.challenges.length}`} />
        <DarkMetric label="Trades completed" value={String(progression.trade_count)} />
        <DarkMetric label="Reveals opened" value={String(progression.reveal_count)} />
      </div>
    </section>

    <section aria-labelledby="how-rewards-work" className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <h2 id="how-rewards-work" className="text-2xl font-black">How it works</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Step number="1" icon={<Target className="size-5"/>} title="Do a challenge" copy="Buy, sell, build your team or come back for a Reveal." />
        <Step number="2" icon={<Award className="size-5"/>} title="Earn a badge" copy="The game checks your real activity and awards it automatically." />
        <Step number="3" icon={<Gift className="size-5"/>} title="Unlock rewards" copy="Spend Style Credits on permanent profile style, formations and useful Market tools." />
      </div>
      <p className="mt-4 rounded-xl border border-sky-700/15 bg-sky-50 px-4 py-3 text-sm text-sky-950"><strong>Good to know:</strong> Style Credits are free game points. They cannot be bought, sold, withdrawn or exchanged for money.</p>
    </section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Clubhouse reputation</p><h2 className="mt-2 text-3xl font-black">You are a {currentTier.name}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Earn badges by finishing challenges. Higher tiers let you buy stronger permanent tools with Style Credits.</p></div><div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4"><p className="text-xs font-bold text-muted-foreground">Badges earned</p><p className="mt-1 text-2xl font-black text-primary">{completed.length}</p></div></div>
      <div className="mt-6 grid gap-2 sm:grid-cols-5">{CLUBHOUSE_TIERS.map((tier)=><div key={tier.name} className={`rounded-xl border p-3 ${completed.length>=tier.badges?'border-emerald-500/30 bg-emerald-50':'border-border bg-background/70'}`}><p className="font-black">{tier.name}</p><p className="mt-1 text-xs text-muted-foreground">{tier.badges} badges</p></div>)}</div>
      {nextTier?<p className="mt-4 text-sm font-semibold">Earn {nextTier.badges-completed.length} more badge{nextTier.badges-completed.length===1?'':'s'} to reach {nextTier.name}.</p>:<p className="mt-4 text-sm font-semibold text-emerald-800">Every Clubhouse tier is unlocked.</p>}
      <div className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm leading-6"><strong>One simple rule:</strong> earn the required badges, trades and Reveals first. Then use Style Credits to claim the upgrade forever. Your VX squad budget is never touched.</div>
    </section>

    {message ? <p role="status" className="rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">{message}</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p> : null}
    {loading ? <p role="status" className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Checking your latest achievements…</p> : null}

    {closest ? <section className="rounded-[2rem] border border-primary/25 bg-[linear-gradient(135deg,rgba(16,185,129,.13),rgba(255,255,255,.85))] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Closest goal</p><h2 className="mt-2 text-2xl font-black">{closest.title}</h2><p className="mt-1 text-sm text-muted-foreground">{closest.description}</p></div>
        <div className="rounded-2xl border border-primary/20 bg-card px-5 py-4 text-right"><p className="text-xs text-muted-foreground">Reward</p><p className="text-lg font-black text-primary">{closest.badge_name} + {closest.reward_credits} credits</p></div>
      </div>
      <ChallengeProgress challenge={closest} large />
    </section> : null}

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Challenge board</p><h2 className="mt-2 text-3xl font-black">Choose your next goal</h2><p className="mt-2 text-sm text-muted-foreground">Progress is saved to your account and checked after Market actions.</p></div>
        <div role="group" aria-label="Filter challenges" className="flex rounded-xl border border-border bg-background p-1">
          <FilterButton active={filter==='next'} onClick={()=>setFilter('next')}>To do ({progression.challenges.length-completed.length})</FilterButton>
          <FilterButton active={filter==='earned'} onClick={()=>setFilter('earned')}>Earned ({completed.length})</FilterButton>
          <FilterButton active={filter==='all'} onClick={()=>setFilter('all')}>All</FilterButton>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleChallenges.map((challenge) => <ChallengeCard key={challenge.challenge_key} challenge={challenge} busy={Boolean(busy)} showcasedCount={showcased.length} badgeLimit={badgeLimit} onToggleShowcase={toggleShowcase} />)}
      </div>
      {!visibleChallenges.length ? <p className="mt-6 rounded-xl bg-secondary/50 p-5 text-sm font-semibold">You have finished every challenge in this view. Brilliant work.</p> : null}
    </section>

    <section className="rounded-[2rem] border border-amber-500/20 bg-[linear-gradient(135deg,#fffbeb,#fff)] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-amber-800">Badge cabinet</p><h2 className="mt-2 text-3xl font-black text-amber-950">Pick up to {badgeLimit} to show</h2><p className="mt-2 text-sm text-amber-950/70">Your chosen badges appear at the top of your public profile.</p></div>{profile?.username ? <Link href={`/player/${encodeURIComponent(profile.username)}`} className="rounded-xl border border-amber-700/20 bg-white px-4 py-2.5 text-sm font-bold text-amber-950">Preview my profile</Link> : null}</div>
      <div className="mt-5 flex min-h-20 flex-wrap items-center gap-3">{showcased.length ? showcased.map((badge)=><span key={badge.challenge_key} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-white px-4 py-3 text-sm font-black text-amber-950"><Medal className="size-5 text-amber-600"/>{badge.badge_name}</span>) : <p className="text-sm text-amber-950/70">No badges selected yet. Open the “Earned” tab above and choose “Show on profile”.</p>}</div>
      <p className="mt-3 text-xs font-semibold text-amber-900/65">{showcased.length}/{badgeLimit} profile spaces used</p>
    </section>

    <section id="reward-shop" className="scroll-mt-24 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Clubhouse shop</p><h2 className="mt-2 text-3xl font-black">Turn progress into something yours</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Start with affordable profile style, then work towards rare titles, a larger badge cabinet, formations and permanent Arena access. Nothing uses real money or your VX team budget.</p></div><div role="group" aria-label="Filter Clubhouse rewards" className="flex rounded-xl border border-border bg-background p-1"><FilterButton active={storeFilter==='all'} onClick={()=>setStoreFilter('all')}>All</FilterButton><FilterButton active={storeFilter==='style'} onClick={()=>setStoreFilter('style')}>Style</FilterButton><FilterButton active={storeFilter==='gameplay'} onClick={()=>setStoreFilter('gameplay')}>Game access</FilterButton></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleStore.map((item) => <RewardCard key={item.item_key} item={item} progression={progression} isEquipped={equipped.has(item.item_key)} busy={Boolean(busy)} onAct={act} />)}</div>
    </section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Profile privacy</p><h2 className="mt-2 text-2xl font-black">You choose what people see</h2><p className="mt-2 text-sm text-muted-foreground">Your username and current roster remain public for fair play. Badges, Market stats and activity are your choice.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <PrivacyToggle label="Show my badges" checked={progression.preferences.show_badges} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_badges:value}}))}/>
        <PrivacyToggle label="Show my Market stats" checked={progression.preferences.show_market_stats} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_market_stats:value}}))}/>
        <PrivacyToggle label="Show recent activity" checked={progression.preferences.show_activity} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_activity:value}}))}/>
        <PrivacyToggle label="Show reward celebrations" checked={progression.preferences.reward_celebrations} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,reward_celebrations:value}}))}/>
      </div>
      <button disabled={Boolean(busy)} onClick={() => void act('privacy',async()=>{if(user){const key=`verdict-xi-skip-reward-celebrations:${user.id}`;if(progression.preferences.reward_celebrations)window.localStorage.removeItem(key);else window.localStorage.setItem(key,'true')}const [profileResult,celebrationResult]=await Promise.all([updateMarketProfilePreferences(progression.preferences),setMarketRewardCelebrations(progression.preferences.reward_celebrations)]);return{error:profileResult.error??celebrationResult.error}},'Your profile and celebration choices are saved.')} className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Save choices</button>
    </section>
  </div>
}

function ChallengeCard({challenge,busy,showcasedCount,badgeLimit,onToggleShowcase}:{challenge:MarketChallenge;busy:boolean;showcasedCount:number;badgeLimit:number;onToggleShowcase:(key:string)=>Promise<void>}) {
  const Icon = iconByKey[challenge.icon_key as keyof typeof iconByKey] ?? Award
  const done = Boolean(challenge.completed_at)
  return <article className={`flex flex-col rounded-2xl border p-5 ${done?'border-emerald-500/30 bg-emerald-50/70':'border-border bg-background/70'}`}>
    <div className="flex items-start justify-between gap-3"><span className={`rounded-xl p-2.5 ${done?'bg-emerald-600 text-white':'bg-secondary text-foreground'}`}><Icon className="size-5"/></span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold">+{challenge.reward_credits} credits</span></div>
    <h3 className="mt-4 text-lg font-black">{challenge.title}</h3><p className="mt-1 flex-1 text-sm leading-5 text-muted-foreground">{challenge.description}</p>
    <ChallengeProgress challenge={challenge}/>
    <p className="mt-3 text-sm font-bold">{done?<span className="text-emerald-800"><Check className="mr-1 inline size-4"/>Earned: {challenge.badge_name}</span>:`Badge waiting: ${challenge.badge_name}`}</p>
    {done ? <button disabled={busy} onClick={()=>void onToggleShowcase(challenge.challenge_key)} className="mt-4 min-h-11 w-full rounded-xl border border-emerald-700/25 bg-white px-3 py-2 text-sm font-bold text-emerald-950 disabled:opacity-50">{challenge.showcased?'Remove from profile':showcasedCount>=badgeLimit?'Swap into profile':'Show on profile'}</button> : null}
  </article>
}

function RewardCard({item,progression,isEquipped,busy,onAct}:{item:MarketRewardItem;progression:MarketProgression;isEquipped:boolean;busy:boolean;onAct:(key:string,action:()=>Promise<{error:Error|null}>,success:string)=>Promise<void>}) {
  const unlocked=rewardItemUnlocked(item,progression)
  const hasCredits=progression.wallet.balance>=item.price_credits
  const tradesLeft=Math.max(0,item.required_trades-progression.trade_count)
  const revealsLeft=Math.max(0,item.required_reveals-progression.reveal_count)
  const badgesEarned=progression.challenges.filter((challenge)=>challenge.completed_at).length
  const badgesLeft=Math.max(0,item.required_badges-badgesEarned)
  const tier=clubhouseTierForItem(item)
  const equippable=['background','avatar','frame','title'].includes(item.item_type)
  const RewardIcon=item.item_type==='access'?Swords:item.item_type==='title'?Crown:item.item_type==='utility'?Gift:Palette
  return <article className="flex flex-col rounded-2xl border border-border bg-background/70 p-5">
    <div className="flex items-start justify-between gap-2"><span className="rounded-xl bg-secondary p-2.5"><RewardIcon className="size-5"/></span><div className="flex flex-wrap justify-end gap-1.5"><span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{tier.name}</span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold">{item.price_credits} credits</span></div></div>
    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">{rewardTypeName(item.item_type)}</p><h3 className="mt-1 text-lg font-black">{item.name}</h3><p className="mt-1 flex-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
    {!item.owned && !unlocked ? <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs"><p className="font-bold"><LockKeyhole className="mr-1 inline size-4"/>Complete before buying</p><ul className="mt-2 space-y-1 text-muted-foreground"><li className={badgesLeft?'':'text-emerald-700'}>{badgesLeft?`${badgesLeft} more badge${badgesLeft===1?'':'s'}`:'Badge requirement complete'}</li><li className={tradesLeft?'':'text-emerald-700'}>{tradesLeft?`${tradesLeft} more trade${tradesLeft===1?'':'s'}`:'Trade requirement complete'}</li><li className={revealsLeft?'':'text-emerald-700'}>{revealsLeft?`${revealsLeft} more Reveal${revealsLeft===1?'':'s'}`:'Reveal requirement complete'}</li></ul></div> : null}
    {item.owned ? item.item_type==='formation'||equippable ? <button disabled={isEquipped||busy} onClick={()=>void onAct(`equip:${item.item_key}`,()=>item.item_type==='formation'?setMarketFormation('3-4-3'):equipMarketReward(item.item_key),`${item.name} is now active.`)} className="mt-4 min-h-11 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-55">{isEquipped?<><Check className="mr-1 inline size-4"/>Active now</>:'Use this reward'}</button> : <Link href={item.item_type==='access'?'/market/arena':'/market/tools'} className="mt-4 block rounded-xl border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-900"><Check className="mr-1 inline size-4"/>{item.item_type==='access'?'Enter Arena':'Open this tool'}</Link>
      : <button disabled={!unlocked||!hasCredits||busy} onClick={()=>void onAct(`buy:${item.item_key}`,()=>purchaseMarketReward(item.item_key),`${item.name} is yours forever.`)} className="mt-4 min-h-11 w-full rounded-xl bg-foreground px-3 py-2 text-sm font-bold text-background disabled:opacity-45">{!unlocked?'Locked':!hasCredits?`Need ${item.price_credits-progression.wallet.balance} more credits`:'Unlock forever'}</button>}
  </article>
}

function SignedOutRewards(){return <section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><Gift className="size-9 text-primary"/><h1 className="mt-4 text-4xl font-black tracking-tight">Challenges, badges and rewards</h1><p className="mt-3 max-w-2xl leading-6 text-muted-foreground">Create a free Verdict XI profile. Your Market actions will earn badges and Style Credits automatically.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/signup" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Create my profile</Link><Link href="/market/players" className="rounded-xl border border-border px-5 py-3 font-bold">See the Market first</Link></div></section>}
function ChallengeProgress({challenge,large=false}:{challenge:MarketChallenge;large?:boolean}){return <div className="mt-4"><div className={`${large?'h-3':'h-2'} overflow-hidden rounded-full bg-secondary`} role="progressbar" aria-label={`${challenge.title} progress`} aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={Math.min(challenge.progress,challenge.target)}><div className="h-full rounded-full bg-primary" style={{width:`${challengePercent(challenge)}%`}}/></div><div className="mt-2 flex justify-between text-xs"><span>{Math.min(challenge.progress,challenge.target).toLocaleString()} done</span><span>{challenge.target.toLocaleString()} needed</span></div></div>}
function Step({number,icon,title,copy}:{number:string;icon:ReactNode;title:string;copy:string}){return <div className="rounded-2xl border border-border bg-background/70 p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary font-black text-primary-foreground">{number}</span><span className="text-primary">{icon}</span></div><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{copy}</p></div>}
function FilterButton({active,onClick,children}:{active:boolean;onClick:()=>void;children:ReactNode}){return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-lg px-3 text-xs font-bold transition ${active?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-secondary'}`}>{children}</button>}
function DarkMetric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs text-emerald-50/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}
function PrivacyToggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)} className="size-5 accent-emerald-600"/></label>}
function rewardTypeName(type:MarketRewardItem['item_type']){return type==='background'?'Profile background':type==='avatar'?'Profile icon':type==='frame'?'Profile frame':type==='formation'?'Team formation':type==='title'?'Profile title':type==='utility'?'Clubhouse upgrade':'Game access'}
function friendlyProgressionError(message:string){if(/ITEM_LOCKED/i.test(message))return 'Keep playing: this reward needs more trades or Reveals first.';if(/NOT_ENOUGH_REWARD_CREDITS/i.test(message))return 'You need more Style Credits for that reward.';if(/FORMATION_NOT_UNLOCKED/i.test(message))return 'Unlock the 3-4-3 reward before using that formation.';if(/SELL_ONE_DEFENDER_FIRST/i.test(message))return 'Sell one defender first, then switch to 3-4-3.';if(/SELL_ONE_MIDFIELDER_FIRST/i.test(message))return 'Sell one midfielder first, then switch to 4-3-3.';if(/timeout|temporarily busy/i.test(message))return 'The Market is busy. Nothing changed—please try again.';return 'That did not work. Nothing was changed. Please try again.'}
