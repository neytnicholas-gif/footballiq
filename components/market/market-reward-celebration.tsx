'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Award, Check, Sparkles, Trophy, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { loadMyMarketProgression, setMarketRewardCelebrations } from '@/lib/market/client'
import { clubhouseTierForBadges, type MarketChallenge } from '@/lib/market/progression'
import { useModalFocus } from '@/lib/use-modal-focus'

const confetti = Array.from({ length: 22 }, (_, index) => ({
  left: `${4 + ((index * 17) % 92)}%`,
  delay: `${(index % 7) * 90}ms`,
  duration: `${900 + (index % 5) * 130}ms`,
  color: ['#34d399','#38bdf8','#fbbf24','#fb7185','#a78bfa'][index % 5],
  rotate: `${(index * 47) % 180}deg`,
}))

export function MarketRewardCelebration() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [earned,setEarned]=useState<MarketChallenge[]>([])
  const [allCompleted,setAllCompleted]=useState(0)
  const [saving,setSaving]=useState(false)
  const checking=useRef(false)
  const skipButtonRef=useRef<HTMLButtonElement>(null)
  const seenKey=user?`early-shout:seen-market-badges:${user.id}`:''
  const skipKey=user?`early-shout:skip-reward-celebrations:${user.id}`:''

  useEffect(()=>{
    if(!user||!pathname.startsWith('/market')||checking.current)return
    checking.current=true
    void loadMyMarketProgression(true).then(({data})=>{
      const completed=data.challenges.filter((challenge)=>challenge.completed_at)
      setAllCompleted(completed.length)
      const seen=new Set<string>(readStoredList(seenKey))
      if(!data.preferences.reward_celebrations||window.localStorage.getItem(skipKey)==='true'){window.localStorage.setItem(seenKey,JSON.stringify(completed.map((challenge)=>challenge.challenge_key)));return}
      const unseen=completed.filter((challenge)=>!seen.has(challenge.challenge_key))
      if(unseen.length)setEarned(unseen)
    }).finally(()=>{checking.current=false})
  },[pathname,seenKey,skipKey,user])

  const close=useCallback(()=>{
    if(seenKey){const seen=new Set<string>(readStoredList(seenKey));earned.forEach((challenge)=>seen.add(challenge.challenge_key));window.localStorage.setItem(seenKey,JSON.stringify([...seen]))}
    setEarned([])
  },[earned,seenKey])

  const dialogRef=useModalFocus<HTMLElement>({open:earned.length>0,onClose:close,canClose:!saving,initialFocusRef:skipButtonRef})

  async function alwaysSkip(){setSaving(true);if(skipKey)window.localStorage.setItem(skipKey,'true');await setMarketRewardCelebrations(false);close();setSaving(false)}
  if(!earned.length)return null

  const grouped=earned.length>1
  const credits=earned.reduce((sum,challenge)=>sum+challenge.reward_credits,0)
  const latest=earned.toSorted((a,b)=>(b.completed_at??'').localeCompare(a.completed_at??''))[0]!
  const tier=clubhouseTierForBadges(allCompleted)

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-emerald-950/80 p-4 backdrop-blur-md" role="presentation">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reward-celebration-title" className="relative my-6 w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_50%_10%,rgba(251,191,36,.34),transparent_36%),linear-gradient(145deg,#0b2f27,#071b17)] p-1 shadow-[0_32px_100px_rgba(0,0,0,.55)] outline-none motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-reduce:animate-none">
      {confetti.map((piece,index)=><span key={index} aria-hidden="true" className="pointer-events-none absolute -top-5 h-3 w-2 rounded-sm motion-safe:animate-[reward-confetti_var(--duration)_ease-out_var(--delay)_both] motion-reduce:hidden" style={{left:piece.left,backgroundColor:piece.color,rotate:piece.rotate,'--delay':piece.delay,'--duration':piece.duration} as CSSProperties}/>) }
      <div className="relative rounded-[1.75rem] border border-white/10 bg-white/[.06] px-6 pb-7 pt-12 text-center text-white sm:px-10 sm:pb-10 sm:pt-14">
        <button ref={skipButtonRef} type="button" onClick={close} aria-label="Skip reward celebration" className="absolute right-4 top-4 inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Skip<X className="size-3.5"/></button>
        <div className="relative mx-auto grid size-28 place-items-center rounded-full border border-amber-200/50 bg-[radial-gradient(circle,#fef3c7,#f59e0b)] text-amber-950 shadow-[0_0_55px_rgba(251,191,36,.55)] motion-safe:animate-[reward-pop_.7s_cubic-bezier(.2,.9,.2,1)_both] motion-reduce:animate-none"><span className="absolute inset-[-12px] rounded-full border border-dashed border-amber-200/40 motion-safe:animate-[spin_12s_linear_infinite] motion-reduce:animate-none"/><Trophy className="size-12"/></div>
        <p className="mt-7 text-xs font-black uppercase tracking-[.3em] text-amber-300">{grouped?'Clubhouse haul':'Badge unlocked'}</p>
        <h2 id="reward-celebration-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{grouped?`${earned.length} achievements ready`:`${latest.badge_name}`}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-emerald-50/75">{grouped?'Your recent Market work has been counted. These badges and credits are now permanently yours.':latest.title}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><RewardStat icon={<Award className="size-5"/>} label="Badges" value={`+${earned.length}`}/><RewardStat icon={<Sparkles className="size-5"/>} label="Style Credits" value={`+${credits}`}/><RewardStat icon={<Check className="size-5"/>} label="Clubhouse tier" value={tier.name}/></div>
        {!grouped?<p className="mt-5 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-emerald-50/80">{latest.description}</p>:<div className="mt-5 flex flex-wrap justify-center gap-2">{earned.slice(0,6).map((challenge)=><span key={challenge.challenge_key} className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-bold text-amber-100">{challenge.badge_name}</span>)}{earned.length>6?<span className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold">+{earned.length-6} more</span>:null}</div>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/market/rewards" onClick={close} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-6 py-3 font-black text-amber-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">See my rewards</Link><button type="button" onClick={close} className="min-h-12 rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">Keep playing</button></div>
        <button type="button" disabled={saving} onClick={()=>void alwaysSkip()} className="mt-5 rounded text-xs font-semibold text-white/45 underline decoration-white/20 underline-offset-4 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50">{saving?'Saving preference...':'Always skip reward celebrations'}</button>
      </div>
    </section>
  </div>
}

function RewardStat({icon,label,value}:{icon:ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><span className="mx-auto flex justify-center text-amber-300">{icon}</span><p className="mt-2 text-xs text-emerald-50/60">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>}
function readStoredList(key:string){try{const value=JSON.parse(window.localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter((entry):entry is string=>typeof entry==='string'):[]}catch{return[]}}
