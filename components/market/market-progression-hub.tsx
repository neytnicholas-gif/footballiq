'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Award, CalendarDays, ChartNoAxesColumnIncreasing, Check, Coins, Crown, Eye,
  Gift, Globe2, Handshake, LockKeyhole, Medal, Palette, Repeat2, Shield,
  ShoppingBag, Sparkles, Swords, Trophy, Users,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import {
  equipMarketReward, loadMyMarketProgression, purchaseMarketReward,
  setMarketFormation, setMarketRewardCelebrations, setMarketShowcaseBadges,
  updateMarketProfilePreferences,
} from '@/lib/market/client'
import {
  challengePercent, clubhouseTierForBadges, clubhouseTierForItem,
  CLUBHOUSE_TIERS, EMPTY_MARKET_PROGRESSION, rewardItemUnlocked,
  type MarketChallenge, type MarketProgression, type MarketRewardItem,
} from '@/lib/market/progression'

type ChallengeFilter = 'next' | 'earned' | 'all'
type StoreFilter = 'all' | 'style' | 'gameplay'
type RewardsView = 'challenges' | 'shop' | 'profile'

const iconByKey = {
  'shopping-bag': ShoppingBag, handshake: Handshake, users: Users, shield: Shield,
  'trending-up': ChartNoAxesColumnIncreasing, chart: ChartNoAxesColumnIncreasing,
  repeat: Repeat2, medal: Medal, eye: Eye, globe: Globe2, sparkles: Sparkles,
  calendar: CalendarDays, trophy: Trophy, crown: Crown, swords: Swords,
} as const

export function MarketProgressionHub() {
  const { user, profile } = useAuth()
  const [progression, setProgression] = useState<MarketProgression>(EMPTY_MARKET_PROGRESSION)
  const [view, setView] = useState<RewardsView>('challenges')
  const [filter, setFilter] = useState<ChallengeFilter>('next')
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const [showAllChallenges, setShowAllChallenges] = useState(false)
  const [showAllRewards, setShowAllRewards] = useState(false)
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
    let active = true
    const timer = window.setTimeout(() => {
      void (async () => {
        // Show the last saved Clubhouse state quickly. Recalculate challenge
        // progress afterwards so a slower database refresh never traps the
        // player behind a long loading screen.
        setLoading(true)
        const snapshot = await loadMyMarketProgression(false)
        if (!active) return
        setProgression(snapshot.data)
        setError(snapshot.error ? friendlyProgressionError(snapshot.error.message) : '')
        setLoading(false)

        const refreshed = await loadMyMarketProgression(true)
        if (!active) return
        if (refreshed.error) {
          setError(friendlyProgressionError(refreshed.error.message))
        } else {
          setProgression(refreshed.data)
          setError('')
        }
      })()
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [user])

  useEffect(() => {
    const followHash = () => { if (window.location.hash === '#reward-shop') setView('shop') }
    followHash()
    window.addEventListener('hashchange', followHash)
    return () => window.removeEventListener('hashchange', followHash)
  }, [])

  const completed = useMemo(() => progression.challenges.filter((challenge) => challenge.completed_at), [progression.challenges])
  const currentTier = clubhouseTierForBadges(completed.length)
  const nextTier = CLUBHOUSE_TIERS.find((tier) => tier.badges > completed.length) ?? null
  const showcased = useMemo(() => completed.filter((challenge) => challenge.showcased).toSorted((a,b)=>(a.showcased_order??9)-(b.showcased_order??9)), [completed])
  const closest = useMemo(() => progression.challenges.filter((challenge)=>!challenge.completed_at).toSorted((a,b)=>challengePercent(b)-challengePercent(a))[0] ?? null, [progression.challenges])
  const visibleChallenges = useMemo(() => {
    if (filter === 'earned') return completed
    if (filter === 'next') return progression.challenges.filter((challenge)=>!challenge.completed_at)
    return progression.challenges
  }, [completed, filter, progression.challenges])
  const visibleStore = useMemo(() => progression.store.filter((item) => {
    if (storeFilter === 'style') return ['background','avatar','frame','title'].includes(item.item_type)
    if (storeFilter === 'gameplay') return ['formation','utility','access'].includes(item.item_type)
    return true
  }).toSorted((a,b)=>Number(b.owned)-Number(a.owned)||Number(rewardItemUnlocked(b,progression))-Number(rewardItemUnlocked(a,progression))||a.price_credits-b.price_credits), [progression, storeFilter])
  const badgeLimit = progression.store.some((item)=>item.item_key==='utility_badge_cabinet'&&item.owned) ? 5 : 3
  const equipped = useMemo(() => new Set([
    progression.preferences.active_background, progression.preferences.active_avatar,
    progression.preferences.active_frame, progression.preferences.active_title,
    progression.preferences.active_formation==='3-4-3'?'formation_343':null,
  ].filter(Boolean)), [progression.preferences])

  async function act(key:string, action:()=>Promise<{error:Error|null}>, success:string) {
    setBusy(key); setMessage(''); setError('')
    const result=await action()
    if(result.error)setError(friendlyProgressionError(result.error.message))
    else{setMessage(success);await reload()}
    setBusy('')
  }

  async function toggleShowcase(key:string){
    const selected=showcased.map((badge)=>badge.challenge_key)
    const next=selected.includes(key)?selected.filter((entry)=>entry!==key):[...selected,key].slice(-badgeLimit)
    await act(`badge:${key}`,()=>setMarketShowcaseBadges(next),'Your public badge cabinet has been updated.')
  }

  if(!user)return <SignedOutRewards />
  if(loading&&!progression.challenges.length&&!progression.store.length)return <ClubhouseLoading />
  if(error&&!progression.challenges.length&&!progression.store.length)return <ClubhouseLoadError onRetry={()=>void reload()}/>

  const challengesToShow=showAllChallenges?visibleChallenges:visibleChallenges.slice(0,6)
  const rewardsToShow=showAllRewards?visibleStore:visibleStore.slice(0,6)
  const tierProgress=nextTier?Math.min(100,Math.round((completed.length/nextTier.badges)*100)):100

  return <div className="space-y-5">
    <section className="rounded-[2rem] border border-emerald-950/10 bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">My Clubhouse</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Play. Earn. Make it yours.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Finish Market goals to earn badges and free Style Credits. Spend the credits on permanent rewards.</p></div>
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-950 px-5 py-4 text-white"><span className="grid size-11 place-items-center rounded-xl bg-emerald-300/15 text-emerald-200"><Coins className="size-5"/></span><div><p className="text-xs font-bold text-emerald-100/70">Style Credits</p><p className="text-2xl font-black">{progression.wallet.balance.toLocaleString()}</p></div></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><SimpleMetric label="Badges earned" value={`${completed.length} of ${progression.challenges.length}`}/><SimpleMetric label="Clubhouse level" value={currentTier.name}/><SimpleMetric label="Market activity" value={`${progression.trade_count} trades · ${progression.reveal_count} Reveals`}/></div>
      <div className="mt-5 flex flex-wrap gap-2"><Link href="/market/players" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Play the Market</Link><Link href="/market/roster" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2.5 text-sm font-bold">See my roster</Link></div>
    </section>

    {closest?<section aria-labelledby="next-goal-title" className="rounded-[2rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(45,212,191,.14),transparent_30%),linear-gradient(135deg,#0a4039,#082f2a)] p-6 text-emerald-50 sm:p-7"><div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Your next goal</p><h2 id="next-goal-title" className="mt-2 text-2xl font-black text-white">{closest.title}</h2><p className="mt-1 text-sm text-emerald-50/60">{closest.description}</p><ChallengeProgress challenge={closest} large/><p className="mt-2 text-sm font-black text-emerald-200">{remainingGoalCopy(closest)}</p></div><div className="rounded-2xl border border-white/10 bg-black/15 px-5 py-4 md:min-w-52"><p className="text-xs font-bold text-emerald-50/55">Complete it to earn</p><p className="mt-1 font-black text-white">{closest.badge_name}</p><p className="mt-1 text-sm font-black text-emerald-300">+{closest.reward_credits} Style Credits</p></div></div></section>:null}
    {!closest&&progression.challenges.length?<section className="overflow-hidden rounded-[2rem] border border-amber-300/70 bg-[radial-gradient(circle_at_85%_15%,rgba(251,191,36,.25),transparent_30%),linear-gradient(135deg,#fffbeb,#ffffff)] p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-lg shadow-amber-200"><Trophy className="size-8"/></span><div className="flex-1"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-800">Challenge board complete</p><h2 className="mt-2 text-3xl font-black text-amber-950">Every badge. Every goal. Cleared.</h2><p className="mt-2 text-sm leading-6 text-amber-950/75">You completed all {progression.challenges.length} available challenges. Choose the badges you want everyone to see.</p></div><button type="button" onClick={()=>setView('profile')} className="min-h-11 rounded-xl bg-amber-950 px-5 py-2.5 text-sm font-black text-white">Open my badges</button></div></section>:null}

    <nav aria-label="Clubhouse sections" className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
      <ViewButton active={view==='challenges'} icon={<Award className="size-5"/>} onClick={()=>setView('challenges')} label="Challenges" hint="Goals to complete"/>
      <ViewButton active={view==='shop'} icon={<Gift className="size-5"/>} onClick={()=>setView('shop')} label="Reward Shop" hint="Spend credits"/>
      <ViewButton active={view==='profile'} icon={<Medal className="size-5"/>} onClick={()=>setView('profile')} label="My Profile" hint="Badges & privacy"/>
    </nav>

    {message?<p role="status" className="rounded-xl border border-emerald-300/20 bg-[#0b463e] px-4 py-3 text-sm font-semibold text-emerald-100">{message}</p>:null}
    {error?<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>:null}

    {view==='challenges'?<section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">{filter==='earned'?'Badge collection':'Challenges'}</p><h2 className="mt-2 text-3xl font-black">{filter==='earned'?'Badges you have earned':filter==='all'?'Your full challenge board':'Choose your next goal'}</h2><p className="mt-2 text-sm text-muted-foreground">{filter==='earned'?'Pick the badges you want to show on your public profile.':filter==='all'?'See every completed and upcoming challenge in one place.':'Your progress updates automatically while you play.'}</p></div><div role="group" aria-label="Filter challenges" className="flex rounded-xl border border-border bg-background p-1"><FilterButton active={filter==='next'} onClick={()=>{setFilter('next');setShowAllChallenges(false)}}>To do ({progression.challenges.length-completed.length})</FilterButton><FilterButton active={filter==='earned'} onClick={()=>{setFilter('earned');setShowAllChallenges(false)}}>Earned ({completed.length})</FilterButton><FilterButton active={filter==='all'} onClick={()=>{setFilter('all');setShowAllChallenges(false)}}>All</FilterButton></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{challengesToShow.map((challenge,index)=><ChallengeCard key={challenge.challenge_key} challenge={challenge} visualIndex={index} busy={Boolean(busy)} showcasedCount={showcased.length} badgeLimit={badgeLimit} onToggleShowcase={toggleShowcase}/>)}</div>
      {!visibleChallenges.length?<ChallengeEmptyState filter={filter}/>:null}
      {visibleChallenges.length>6?<button type="button" onClick={()=>setShowAllChallenges((value)=>!value)} className="mt-6 min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-bold">{showAllChallenges?'Show fewer':`Show all ${visibleChallenges.length}`}</button>:null}
    </section>:null}

    {view==='shop'?<section id="reward-shop" className="scroll-mt-24 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Reward Shop</p><h2 className="mt-2 text-3xl font-black">Choose something to keep</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Meet the goal, then spend Style Credits. Your player-buying Market Credits are never used.</p></div><div role="group" aria-label="Filter Clubhouse rewards" className="flex rounded-xl border border-border bg-background p-1"><FilterButton active={storeFilter==='all'} onClick={()=>{setStoreFilter('all');setShowAllRewards(false)}}>All</FilterButton><FilterButton active={storeFilter==='style'} onClick={()=>{setStoreFilter('style');setShowAllRewards(false)}}>Profile style</FilterButton><FilterButton active={storeFilter==='gameplay'} onClick={()=>{setStoreFilter('gameplay');setShowAllRewards(false)}}>Game upgrades</FilterButton></div></div>
      <p className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-950/70 px-4 py-3 text-sm text-emerald-50"><strong className="text-emerald-300">Free game rewards:</strong> Style Credits cannot be bought, sold or withdrawn.</p>
      {storeFilter!=='gameplay'&&visibleStore.some((item)=>item.item_type==='frame')?<div className="mt-3 flex items-start gap-3 rounded-xl border border-violet-300/20 bg-[#282346] px-4 py-3 text-sm text-violet-100"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-300/15 text-violet-200"><Palette className="size-4"/></span><p className="leading-5"><strong className="text-white">Frames are your choice.</strong> Preview the styles below, unlock the ones you like and choose which owned frame to wear. You can swap whenever you want.</p></div>:null}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rewardsToShow.map((item,index)=><RewardCard key={item.item_key} item={item} visualIndex={index} progression={progression} isEquipped={equipped.has(item.item_key)} busy={Boolean(busy)} onAct={act}/>)}</div>
      {visibleStore.length>6?<button type="button" onClick={()=>setShowAllRewards((value)=>!value)} className="mt-6 min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-bold">{showAllRewards?'Show fewer':`Show all ${visibleStore.length} rewards`}</button>:null}
    </section>:null}

    {view==='profile'?<section className="space-y-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="rounded-2xl border border-amber-300/20 bg-[#3a3016] p-5 text-amber-50"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">My badge cabinet</p><h2 className="mt-2 text-2xl font-black text-white">Showing {showcased.length} of {badgeLimit}</h2><p className="mt-1 text-sm text-amber-50/65">Choose badges from the Earned challenge view.</p></div>{profile?.username?<Link href={`/player/${encodeURIComponent(profile.username)}`} className="inline-flex min-h-11 items-center rounded-xl bg-amber-200 px-4 py-2 text-sm font-bold text-amber-950">Preview my profile</Link>:null}</div><div className="mt-4 flex min-h-16 flex-wrap items-center gap-2">{showcased.length?showcased.map((badge)=><span key={badge.challenge_key} className="inline-flex items-center gap-2 rounded-xl border border-amber-200/15 bg-black/15 px-3 py-2 text-sm font-black text-amber-100"><Medal className="size-4 text-amber-300"/>{badge.badge_name}</span>):<p className="text-sm text-amber-50/60">No badges selected yet.</p>}</div></div>
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Profile privacy</p><h2 className="mt-2 text-2xl font-black">Choose what people see</h2><p className="mt-2 text-sm text-muted-foreground">Your username stays public. You choose whether people can see your roster, badges and Market numbers.</p></div>
      <div className="grid gap-3 md:grid-cols-2"><PrivacyToggle label="Show my roster" checked={progression.preferences.show_roster} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_roster:value}}))}/><PrivacyToggle label="Show my badges" checked={progression.preferences.show_badges} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_badges:value}}))}/><PrivacyToggle label="Show my Market stats" checked={progression.preferences.show_market_stats} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_market_stats:value}}))}/><PrivacyToggle label="Show recent activity" checked={progression.preferences.show_activity} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,show_activity:value}}))}/><PrivacyToggle label="Show reward celebrations" checked={progression.preferences.reward_celebrations} onChange={(value)=>setProgression((old)=>({...old,preferences:{...old.preferences,reward_celebrations:value}}))}/></div>
      <button disabled={Boolean(busy)} onClick={()=>void act('privacy',async()=>{if(user){const key=`early-shout:skip-reward-celebrations:${user.id}`;if(progression.preferences.reward_celebrations)window.localStorage.removeItem(key);else window.localStorage.setItem(key,'true')}const [profileResult,celebrationResult]=await Promise.all([updateMarketProfilePreferences(progression.preferences),setMarketRewardCelebrations(progression.preferences.reward_celebrations)]);return{error:profileResult.error??celebrationResult.error}},'Your profile and celebration choices are saved.')} className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Save choices</button>
      <div className="rounded-2xl border border-border bg-secondary/30 p-5"><p className="font-black">Clubhouse level: {currentTier.name}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{width:`${tierProgress}%`}}/></div><p className="mt-2 text-sm text-muted-foreground">{nextTier?`${nextTier.badges-completed.length} more badge${nextTier.badges-completed.length===1?'':'s'} to reach ${nextTier.name}.`:'Every Clubhouse level is unlocked.'}</p></div>
    </section>:null}
  </div>
}

function ChallengeCard({challenge,visualIndex,busy,showcasedCount,badgeLimit,onToggleShowcase}:{challenge:MarketChallenge;visualIndex:number;busy:boolean;showcasedCount:number;badgeLimit:number;onToggleShowcase:(key:string)=>Promise<void>}){
  const Icon=iconByKey[challenge.icon_key as keyof typeof iconByKey]??Award
  const done=Boolean(challenge.completed_at)
  const tone=visualTone(visualIndex)
  return <article className={`relative flex flex-col overflow-hidden rounded-2xl border p-5 text-slate-100 ${tone.card} ${done?'ring-1 ring-emerald-300/25':''}`}><span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}/><div className="flex items-start justify-between gap-3"><span className={`rounded-xl p-2.5 ${tone.icon}`}><Icon className="size-5"/></span><CreditPill amount={challenge.reward_credits} prefix="+"/></div><h3 className="mt-4 text-lg font-black text-white">{challenge.title}</h3><p className="mt-1 flex-1 text-sm leading-5 text-slate-300">{challenge.description}</p><ChallengeProgress challenge={challenge}/><p className={`mt-3 text-sm font-bold ${done?'text-emerald-300':tone.text}`}>{done?<><Check className="mr-1 inline size-4"/>Earned: {challenge.badge_name}</>:`Badge: ${challenge.badge_name}`}</p>{done?<button disabled={busy} onClick={()=>void onToggleShowcase(challenge.challenge_key)} className="mt-4 min-h-11 w-full rounded-xl border border-emerald-200/20 bg-emerald-300 px-3 py-2 text-sm font-bold text-emerald-950 disabled:opacity-50">{challenge.showcased?'Remove from profile':showcasedCount>=badgeLimit?'Swap into profile':'Show on profile'}</button>:null}</article>
}

function RewardCard({item,visualIndex,progression,isEquipped,busy,onAct}:{item:MarketRewardItem;visualIndex:number;progression:MarketProgression;isEquipped:boolean;busy:boolean;onAct:(key:string,action:()=>Promise<{error:Error|null}>,success:string)=>Promise<void>}){
  const unlocked=rewardItemUnlocked(item,progression);const hasCredits=progression.wallet.balance>=item.price_credits
  const tradesLeft=Math.max(0,item.required_trades-progression.trade_count);const revealsLeft=Math.max(0,item.required_reveals-progression.reveal_count)
  const badgesEarned=progression.challenges.filter((challenge)=>challenge.completed_at).length;const badgesLeft=Math.max(0,item.required_badges-badgesEarned)
  const tier=clubhouseTierForItem(item);const equippable=['background','avatar','frame','title'].includes(item.item_type)
  const tone=visualTone(visualIndex)
  const explainer=rewardExplainer(item)
  const actionLabel=item.item_type==='frame'?'Choose this frame':'Use this reward'
  const activeLabel=item.item_type==='frame'?'Your chosen frame':'Active now'
  const activeMessage=item.item_type==='frame'?`Your profile is now wearing the ${item.name} frame.`:`${item.name} is now active.`
  return <article className={`relative flex flex-col overflow-hidden rounded-2xl border p-5 text-slate-100 ${tone.card}`}><span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}/><div className="flex items-start justify-between gap-2"><span className={`rounded-xl p-2.5 ${tone.icon}`}><RewardIconGraphic item={item}/></span><CreditPill amount={item.price_credits}/></div><p className={`mt-4 text-xs font-bold uppercase tracking-wider ${tone.text}`}>{rewardTypeName(item.item_type)} / {tier.name}</p><h3 className="mt-1 text-lg font-black text-white">{item.name}</h3><p className="mt-1 flex-1 text-sm leading-5 text-slate-300">{item.description}</p>{item.item_type==='frame'?<FrameStylePreview item={item}/>:null}<details className="group mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-sm"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-black text-white"><span className="inline-flex items-center gap-2"><Eye className="size-4"/>More info</span><span aria-hidden="true" className="text-lg leading-none text-slate-400 transition group-open:rotate-45">+</span></summary><div className="mt-3 space-y-3 border-t border-white/10 pt-3 text-xs leading-5 text-slate-300"><p><strong className="text-white">What happens?</strong> {explainer.effect}</p><p><strong className="text-white">How do I get it?</strong> {explainer.how}</p><p><strong className="text-white">Do I keep it?</strong> Yes. Once you unlock it, it stays on your account.</p></div></details>{!item.owned&&!unlocked?<details className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3 text-xs"><summary className="cursor-pointer font-bold text-white"><LockKeyhole className="mr-1 inline size-4"/>What do I still need?</summary><ul className="mt-2 space-y-1 text-slate-300"><li>{badgesLeft?`${badgesLeft} more badge${badgesLeft===1?'':'s'}`:'Badges complete'}</li><li>{tradesLeft?`${tradesLeft} more trade${tradesLeft===1?'':'s'}`:'Trades complete'}</li><li>{revealsLeft?`${revealsLeft} more Reveal${revealsLeft===1?'':'s'}`:'Reveals complete'}</li></ul></details>:null}{item.owned?(item.item_type==='formation'||equippable?<button disabled={isEquipped||busy} onClick={()=>void onAct(`equip:${item.item_key}`,()=>item.item_type==='formation'?setMarketFormation('3-4-3'):equipMarketReward(item.item_key),activeMessage)} className="mt-4 min-h-11 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-55">{isEquipped?<><Check className="mr-1 inline size-4"/>{activeLabel}</>:actionLabel}</button>:<Link href={item.item_type==='access'?'/market/arena':'/market/tools'} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-3 py-2 text-sm font-bold text-emerald-950"><Check className="mr-1 size-4"/>{item.item_type==='access'?'Enter Arena':'Open this tool'}</Link>):<button disabled={!unlocked||!hasCredits||busy} onClick={()=>void onAct(`buy:${item.item_key}`,()=>purchaseMarketReward(item.item_key),`${item.name} is yours forever.`)} className="mt-4 min-h-11 w-full rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-45">{!unlocked?'Locked':!hasCredits?<span className="text-emerald-200">Need {item.price_credits-progression.wallet.balance} more credits</span>:item.item_type==='frame'?'Unlock this frame':'Unlock forever'}</button>}</article>
}

function rewardExplainer(item:MarketRewardItem){
  const requirement=`Finish ${item.required_trades} trade${item.required_trades===1?'':'s'}, open ${item.required_reveals} Reveal${item.required_reveals===1?'':'s'} and earn ${item.required_badges} badge${item.required_badges===1?'':'s'}. Then spend ${item.price_credits} Style Credits.`
  if(item.item_type==='background')return{effect:'It changes the scene behind your public profile.',how:requirement}
  if(item.item_type==='avatar')return{effect:'It gives your public profile a new football icon.',how:requirement}
  if(item.item_type==='frame')return{effect:`It unlocks the ${frameStyleForItem(item).label} frame. Choose it when it suits your profile, or wear any other frame you own. You can swap at any time.`,how:requirement}
  if(item.item_type==='title')return{effect:`It shows the title “${item.name}” below your username.`,how:requirement}
  if(item.item_type==='formation')return{effect:'It unlocks the attacking 3-4-3 shape alongside the free 4-3-3 and 4-4-2 choices.',how:requirement}
  if(item.item_type==='access')return{effect:'It opens the Gameweek Arena, where your XI can face another real player.',how:requirement}
  return{effect:item.description,how:requirement}
}

const FRAME_STYLES:Record<string,{label:string;ring:string;glow:string;icon:string}>={
  frame_rookie:{label:'Academy Silver',ring:'border-slate-200',glow:'shadow-[0_0_22px_rgba(226,232,240,.28)]',icon:'text-slate-100'},
  frame_rising:{label:'Rising Emerald',ring:'border-emerald-300',glow:'shadow-[0_0_22px_rgba(110,231,183,.34)]',icon:'text-emerald-200'},
  frame_clean_sheet:{label:'Clean-Sheet Blue',ring:'border-sky-300',glow:'shadow-[0_0_22px_rgba(125,211,252,.34)]',icon:'text-sky-200'},
  frame_hot_streak:{label:'Hot-Streak Orange',ring:'border-orange-300',glow:'shadow-[0_0_22px_rgba(253,186,116,.34)]',icon:'text-orange-200'},
  frame_invincible:{label:'Invincible Gold',ring:'border-amber-300',glow:'shadow-[0_0_24px_rgba(252,211,77,.38)]',icon:'text-amber-200'},
}

function frameStyleForItem(item:MarketRewardItem){return FRAME_STYLES[item.item_key]??{label:item.name,ring:'border-violet-300',glow:'shadow-[0_0_22px_rgba(196,181,253,.3)]',icon:'text-violet-200'}}

function FrameStylePreview({item}:{item:MarketRewardItem}){
  const style=frameStyleForItem(item)
  return <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><span aria-hidden="true" className={`grid size-14 shrink-0 place-items-center rounded-2xl border-[3px] bg-slate-950 ${style.ring} ${style.glow}`}><Shield className={`size-6 ${style.icon}`}/></span><span><span className="block text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Frame preview</span><span className="mt-0.5 block text-sm font-black text-white">{style.label}</span><span className="mt-0.5 block text-xs leading-4 text-slate-300">One of the styles you can choose to wear.</span></span></div>
}

function CreditPill({amount,prefix=''}:{amount:number;prefix?:string}){return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/20 bg-emerald-300 px-2.5 py-1 text-xs font-black text-emerald-950"><Coins className="size-3.5"/>{prefix}{amount.toLocaleString()} credits</span>}

const VISUAL_TONES=[
  {card:'border-sky-300/20 bg-[#102f43]',bar:'bg-sky-400',icon:'bg-sky-300/15 text-sky-200',text:'text-sky-300'},
  {card:'border-violet-300/20 bg-[#282346]',bar:'bg-violet-400',icon:'bg-violet-300/15 text-violet-200',text:'text-violet-300'},
  {card:'border-amber-300/20 bg-[#3a3016]',bar:'bg-amber-400',icon:'bg-amber-300/15 text-amber-200',text:'text-amber-300'},
  {card:'border-rose-300/20 bg-[#40222d]',bar:'bg-rose-400',icon:'bg-rose-300/15 text-rose-200',text:'text-rose-300'},
  {card:'border-cyan-300/20 bg-[#083743]',bar:'bg-cyan-400',icon:'bg-cyan-300/15 text-cyan-200',text:'text-cyan-300'},
  {card:'border-orange-300/20 bg-[#3d291b]',bar:'bg-orange-400',icon:'bg-orange-300/15 text-orange-200',text:'text-orange-300'},
  {card:'border-indigo-300/20 bg-[#202947]',bar:'bg-indigo-400',icon:'bg-indigo-300/15 text-indigo-200',text:'text-indigo-300'},
  {card:'border-fuchsia-300/20 bg-[#39203b]',bar:'bg-fuchsia-400',icon:'bg-fuchsia-300/15 text-fuchsia-200',text:'text-fuchsia-300'},
  {card:'border-slate-300/20 bg-[#26323a]',bar:'bg-slate-400',icon:'bg-slate-300/15 text-slate-200',text:'text-slate-300'},
  {card:'border-red-300/20 bg-[#402126]',bar:'bg-red-400',icon:'bg-red-300/15 text-red-200',text:'text-red-300'},
  {card:'border-yellow-300/20 bg-[#383319]',bar:'bg-yellow-400',icon:'bg-yellow-300/15 text-yellow-200',text:'text-yellow-300'},
  {card:'border-blue-300/20 bg-[#1d2f49]',bar:'bg-blue-400',icon:'bg-blue-300/15 text-blue-200',text:'text-blue-300'},
] as const

function visualTone(index:number){return VISUAL_TONES[index%VISUAL_TONES.length]}

function RewardIconGraphic({item}:{item:MarketRewardItem}){
  const key=item.item_key
  if(key.includes('keeper')||key.includes('invincible'))return <Shield className="size-5"/>
  if(key.includes('captain')||item.item_type==='title')return <Crown className="size-5"/>
  if(key.includes('scout')||key.includes('watchlist'))return <Eye className="size-5"/>
  if(key.includes('tactician')||key.includes('compare')||key.includes('budget'))return <ChartNoAxesColumnIncreasing className="size-5"/>
  if(key.includes('playmaker')||key.includes('number_ten')||key.includes('hot_streak'))return <Sparkles className="size-5"/>
  if(key.includes('trophy')||key.includes('legend')||key.includes('market_ace'))return <Trophy className="size-5"/>
  if(key.includes('reveal')||key.includes('history'))return <CalendarDays className="size-5"/>
  if(key.includes('badge')||key.includes('frame'))return <Medal className="size-5"/>
  if(item.item_type==='formation')return <Users className="size-5"/>
  if(item.item_type==='access')return <Swords className="size-5"/>
  return <Palette className="size-5"/>
}

function ClubhouseLoading(){return <div className="space-y-5" aria-busy="true" aria-live="polite"><section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-950 text-emerald-200"><Sparkles className="size-5 animate-pulse"/></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-primary">My Clubhouse</p><h1 className="mt-1 text-2xl font-black">Loading your rewards…</h1><p className="mt-1 text-sm text-muted-foreground">Checking your real challenges, badges and Style Credits.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[0,1,2].map((item)=><span key={item} className="h-20 animate-pulse rounded-xl bg-secondary/70"/>)}</div></section><section className="rounded-[2rem] border border-border bg-card p-6"><div className="h-5 w-32 animate-pulse rounded bg-secondary"/><div className="mt-4 h-24 animate-pulse rounded-2xl bg-secondary/60"/></section></div>}

function ClubhouseLoadError({onRetry}:{onRetry:()=>void}){return <section role="alert" className="rounded-[2rem] border border-amber-300/20 bg-[#3a3016] p-7 text-amber-50 sm:p-9"><span className="grid size-12 place-items-center rounded-2xl bg-amber-300/15 text-amber-200"><Shield className="size-6"/></span><h1 className="mt-5 text-3xl font-black text-white">Your Clubhouse did not load.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-amber-50/65">Your progress is safe. We could not fetch it right now, so we have hidden the numbers instead of showing incorrect zeroes.</p><button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-xl bg-amber-200 px-5 py-2.5 text-sm font-black text-amber-950">Try again</button></section>}

function ChallengeEmptyState({filter}:{filter:ChallengeFilter}){
  if(filter==='earned')return <div className="mt-6 rounded-2xl border border-sky-300/20 bg-[#102f43] p-5"><p className="font-black text-white">Your first badge is still waiting.</p><p className="mt-1 text-sm text-sky-100/65">Choose To do, complete one simple goal, and it will appear here automatically.</p></div>
  if(filter==='next')return <div className="mt-6 rounded-2xl border border-amber-300/20 bg-[#3a3016] p-5"><p className="font-black text-white">Every available challenge is complete.</p><p className="mt-1 text-sm text-amber-100/65">That is the whole board cleared. Your badges are ready in My Profile.</p></div>
  return <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5"><p className="font-black">No challenges are available right now.</p><p className="mt-1 text-sm text-muted-foreground">Please try again shortly. Your existing progress is safe.</p></div>
}

function remainingGoalCopy(challenge:MarketChallenge){
  const remaining=Math.max(0,challenge.target-challenge.progress)
  if(remaining===0)return 'Goal complete — your reward is ready.'
  if(challenge.challenge_key.includes('signing'))return `${remaining} more signing${remaining===1?'':'s'} unlocks this badge.`
  if(challenge.challenge_key.includes('sale')||challenge.challenge_key.includes('profit'))return `${remaining} more successful sale${remaining===1?'':'s'} unlocks this badge.`
  if(challenge.challenge_key.includes('watch'))return `Watch ${remaining} more player${remaining===1?'':'s'} to unlock this badge.`
  if(challenge.challenge_key.includes('reveal'))return `Open ${remaining} more Reveal${remaining===1?'':'s'} to unlock this badge.`
  if(challenge.challenge_key.includes('arena'))return `${remaining} more Arena result${remaining===1?'':'s'} unlocks this badge.`
  return `${remaining} more step${remaining===1?'':'s'} unlocks this badge.`
}

function SignedOutRewards(){return <section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><Gift className="size-9 text-primary"/><h1 className="mt-4 text-4xl font-black tracking-tight">Challenges, badges and rewards</h1><p className="mt-3 max-w-2xl leading-6 text-muted-foreground">Create a free Early Shout profile. Your Market actions will earn badges and Style Credits automatically.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/signup" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Create my profile</Link><Link href="/market/players" className="rounded-xl border border-border px-5 py-3 font-bold">See the Market first</Link></div></section>}
function ChallengeProgress({challenge,large=false}:{challenge:MarketChallenge;large?:boolean}){return <div className="mt-4"><div className={`${large?'h-3':'h-2'} overflow-hidden rounded-full bg-secondary`} role="progressbar" aria-label={`${challenge.title} progress`} aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={Math.min(challenge.progress,challenge.target)}><div className="h-full rounded-full bg-primary" style={{width:`${challengePercent(challenge)}%`}}/></div><p className="mt-2 text-xs font-semibold text-muted-foreground">{Math.min(challenge.progress,challenge.target).toLocaleString()} of {challenge.target.toLocaleString()} complete</p></div>}
function FilterButton({active,onClick,children}:{active:boolean;onClick:()=>void;children:ReactNode}){return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 rounded-lg px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-secondary'}`}>{children}</button>}
function ViewButton({active,icon,onClick,label,hint}:{active:boolean;icon:ReactNode;onClick:()=>void;label:string;hint:string}){return <button type="button" aria-pressed={active} onClick={onClick} className={`flex min-h-16 items-center justify-center gap-3 rounded-xl px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active?'bg-emerald-950 text-white shadow-sm':'text-foreground hover:bg-secondary'}`}><span className={active?'text-emerald-300':'text-primary'}>{icon}</span><span><span className="block text-sm font-black">{label}</span><span className={`hidden text-[11px] sm:block ${active?'text-emerald-100/70':'text-muted-foreground'}`}>{hint}</span></span></button>}
function SimpleMetric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-border bg-background/60 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>}
function PrivacyToggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)} className="size-5 accent-emerald-600"/></label>}
function rewardTypeName(type:MarketRewardItem['item_type']){return type==='background'?'Profile background':type==='avatar'?'Profile icon':type==='frame'?'Profile frame':type==='formation'?'Team formation':type==='title'?'Profile title':type==='utility'?'Clubhouse upgrade':'Game access'}
function friendlyProgressionError(message:string){if(/ITEM_LOCKED/i.test(message))return 'Keep playing: this reward needs more badges, trades or Reveals first.';if(/NOT_ENOUGH_REWARD_CREDITS/i.test(message))return 'You need more Style Credits for that reward.';if(/FORMATION_NOT_UNLOCKED/i.test(message))return 'Unlock the 3-4-3 reward before using that formation.';if(/FORMATION_SQUAD_CONFLICT|SELL_ONE_(DEFENDER|MIDFIELDER)_FIRST/i.test(message))return 'Your current players do not fit that shape. Sell the extra player in the full position first.';if(/timeout|temporarily busy/i.test(message))return 'The Market is busy. Nothing changed—please try again.';return 'That did not work. Nothing was changed. Please try again.'}
