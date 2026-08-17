'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BarChart3, BookOpenText, Check, ClipboardList, LockKeyhole, Search, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { ClubColourDot } from '@/components/market/club-colour-dot'
import { formatFiqCompact } from '@/lib/market/format'
import {
  loadMarketPlayers, loadMyMarketProgression, loadMyPortfolioData, loadMyRevealHistory,
  loadMyScoutNotes, saveMarketScoutNote, type MarketScoutNote,
} from '@/lib/market/client'
import { clubhouseTierForItem, EMPTY_MARKET_PROGRESSION, type MarketProgression } from '@/lib/market/progression'
import type { MarketPlayer, MarketPortfolio, MarketRevealSummary } from '@/lib/market/types'

const toolKeys = [
  ['utility_watchlist_50','Bigger shortlist','Track up to 50 players.'],
  ['utility_watchlist_100','Scout network','Track up to 100 players.'],
  ['utility_compare_desk','Comparison desk','Compare three watched players.'],
  ['utility_compare_pro','Five-player comparison','Compare five watched players.'],
  ['utility_budget_planner','Squad budget planner','Test a group of targets without making a trade.'],
  ['utility_scout_notes','Scout notebook','Save private notes with your account.'],
  ['utility_reveal_lab','Reveal Lab','See form and gameweek consistency summaries.'],
  ['utility_history_vault','Season history vault','Keep up to 52 gameweeks in view.'],
] as const

export function MarketToolbox() {
  const { user } = useAuth()
  const [progression,setProgression]=useState<MarketProgression>(EMPTY_MARKET_PROGRESSION)
  const [players,setPlayers]=useState<MarketPlayer[]>([])
  const [portfolio,setPortfolio]=useState<MarketPortfolio|null>(null)
  const [watchlist,setWatchlist]=useState<number[]>([])
  const [reveals,setReveals]=useState<MarketRevealSummary[]>([])
  const [notes,setNotes]=useState<MarketScoutNote[]>([])
  const [selected,setSelected]=useState<number[]>([])
  const [notePlayer,setNotePlayer]=useState<number|null>(null)
  const [noteText,setNoteText]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  const owns=useCallback((key:string)=>progression.store.some((item)=>item.item_key===key&&item.owned),[progression.store])
  const reload=useCallback(async()=>{
    setLoading(true);setError('')
    const [progressResult,playerResult,portfolioResult]=await Promise.all([loadMyMarketProgression(false),loadMarketPlayers(),loadMyPortfolioData()])
    const nextProgress=progressResult.data
    const historyLimit=nextProgress.store.some((item)=>item.item_key==='utility_history_vault'&&item.owned)?52:12
    const [revealResult,noteResult]=await Promise.all([loadMyRevealHistory(historyLimit),loadMyScoutNotes()])
    setProgression(nextProgress);setPlayers(playerResult.data);setPortfolio(portfolioResult.portfolio);setWatchlist(portfolioResult.watchlist)
    setReveals(revealResult.data);setNotes(noteResult.data)
    const firstError=progressResult.error??playerResult.error??portfolioResult.error??revealResult.error??noteResult.error
    if(firstError)setError('Some Clubhouse tools could not load. No account data was changed.')
    setLoading(false)
  },[])
  useEffect(()=>{const timer=window.setTimeout(()=>void reload(),0);return()=>window.clearTimeout(timer)},[reload,user])

  if(!user)return <SignedOutTools/>
  const watchedPlayers=watchlist.map((id)=>players.find((player)=>player.id===id)).filter((player):player is MarketPlayer=>Boolean(player))
  const compareLimit=owns('utility_compare_pro')?5:owns('utility_compare_desk')?3:0
  const watchCapacity=owns('utility_watchlist_100')?100:owns('utility_watchlist_50')?50:20
  const selectedPlayers=selected.map((id)=>players.find((player)=>player.id===id)).filter((player):player is MarketPlayer=>Boolean(player))
  const plannedCost=selectedPlayers.reduce((sum,player)=>sum+player.current_value,0)
  const noteByPlayer=new Map(notes.map((note)=>[note.player_id,note]))
  const lab=buildRevealLab(reveals)

  function togglePlayer(id:number){setSelected((old)=>old.includes(id)?old.filter((entry)=>entry!==id):old.length<compareLimit?[...old,id]:old)}
  function chooseNote(player:MarketPlayer){setNotePlayer(player.id);setNoteText(noteByPlayer.get(player.id)?.note??'');setMessage('');setError('')}
  async function saveNote(){
    const player=players.find((entry)=>entry.id===notePlayer);if(!player)return
    setBusy(true);setMessage('');setError('')
    const result=await saveMarketScoutNote(player.slug,noteText)
    if(result.error)setError('That note was not saved. Nothing else changed.')
    else{setMessage(noteText.trim()?'Scout note saved.':'Scout note removed.');await reload()}
    setBusy(false)
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-emerald-900/15 bg-[radial-gradient(circle_at_85%_10%,rgba(56,189,248,.22),transparent_34%),linear-gradient(135deg,#071d18,#123b31)] p-7 text-white shadow-xl sm:p-10">
      <p className="text-xs font-black uppercase tracking-[.24em] text-sky-300">Clubhouse tools</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Spend progress. Play smarter.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80">These are permanent game tools, not decorations. Unlock them with free Style Credits earned by playing.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><DarkMetric label="Tools owned" value={`${toolKeys.filter(([key])=>owns(key)).length}/${toolKeys.length}`}/><DarkMetric label="Watchlist" value={`${watchlist.length}/${watchCapacity}`}/><DarkMetric label="Style Credits" value={progression.wallet.balance.toLocaleString()}/></div>
    </section>
    {message?<p role="status" className="rounded-xl border border-emerald-300/20 bg-[#0b463e] px-4 py-3 text-sm font-bold text-emerald-100">{message}</p>:null}{error?<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p>:null}
    {loading?<p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Opening your tools...</p>:null}

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Permanent upgrade catalogue</p><h2 className="mt-2 text-3xl font-black">Build your Clubhouse</h2><p className="mt-2 text-sm text-muted-foreground">Cheap tools help early. Larger tools reward a longer Market journey.</p></div><Link href="/market/rewards#reward-shop" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Open reward shop</Link></div>
      <div className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm"><strong>How to get one:</strong> complete challenges to earn badges and Style Credits. Reach the shown tier, finish its trade and Reveal goals, then claim it permanently in Rewards. Market Credits are only used to choose players.</div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{toolKeys.map(([key,name,copy])=>{const item=progression.store.find((entry)=>entry.item_key===key);const tier=item?clubhouseTierForItem(item):null;return <div key={key} className={`rounded-2xl border p-4 ${owns(key)?'border-emerald-300/25 bg-emerald-300/[.08]':'border-white/10 bg-black/15'}`}><p className="flex items-center gap-2 font-black">{owns(key)?<Check className="size-4 text-emerald-300"/>:<LockKeyhole className="size-4 text-muted-foreground"/>}{name}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{copy}</p>{item?<div className="mt-3 space-y-1 text-xs text-muted-foreground"><p><strong className="text-foreground">{tier?.name}</strong> · {item.required_badges} badges</p><p>{item.required_trades} trades · {item.required_reveals} Reveals</p><p className="font-black text-emerald-300">{item.price_credits} Style Credits</p></div>:null}<p className="mt-3 text-xs font-bold">{owns(key)?'Owned forever':'Buy in Rewards when eligible'}</p></div>})}</div>
    </section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Comparison desk</p><h2 className="mt-2 text-3xl font-black">Put your targets side by side</h2>
      {!compareLimit?<Locked copy="Unlock the Comparison desk to compare watched players without buying them."/>:<><p className="mt-2 text-sm text-muted-foreground">Choose up to {compareLimit}. Your selections do not buy or sell anything.</p><div className="mt-4 flex flex-wrap gap-2">{watchedPlayers.map((player)=><button key={player.id} type="button" aria-pressed={selected.includes(player.id)} onClick={()=>togglePlayer(player.id)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${selected.includes(player.id)?'border-primary bg-primary text-primary-foreground':'border-border bg-background'}`}>{player.display_name}</button>)}</div>{!watchedPlayers.length?<p className="mt-4 text-sm text-muted-foreground">Watch some players in the Market first.</p>:null}<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{selectedPlayers.map((player)=><PlayerComparison key={player.id} player={player}/>)}</div></>}
    </section>

    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><ClipboardList className="size-7 text-primary"/><h2 className="mt-3 text-2xl font-black">Squad budget planner</h2>{!owns('utility_budget_planner')?<Locked copy="Unlock the planner to total your comparison targets against your available Market Credits."/>:<div className="mt-4 space-y-3"><PlanMetric label="Selected targets" value={String(selectedPlayers.length)}/><PlanMetric label="Planned cost" value={formatFiqCompact(plannedCost)}/><PlanMetric label="Available credits" value={formatFiqCompact(portfolio?.available_balance??0)}/><PlanMetric label="Credits after plan" value={plannedCost<=(portfolio?.available_balance??0)?formatFiqCompact((portfolio?.available_balance??0)-plannedCost):`Short by ${formatFiqCompact(plannedCost-(portfolio?.available_balance??0))}`} warn={plannedCost>(portfolio?.available_balance??0)}/><p className="text-xs text-muted-foreground">This is a safe plan only. Use the Market when you are ready to make real trades.</p></div>}</div>
      <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><BookOpenText className="size-7 text-primary"/><h2 className="mt-3 text-2xl font-black">Private scout notebook</h2>{!owns('utility_scout_notes')?<Locked copy="Unlock the notebook to save private, cross-device notes on watched players."/>:<><select aria-label="Choose watched player" value={notePlayer??''} onChange={(event)=>{const player=watchedPlayers.find((entry)=>entry.id===Number(event.target.value));if(player)chooseNote(player)}} className="mt-4 min-h-12 w-full rounded-xl border border-border bg-background px-3"><option value="">Choose a watched player</option>{watchedPlayers.map((player)=><option key={player.id} value={player.id}>{player.display_name}</option>)}</select>{notePlayer?<><textarea aria-label="Private scout note" maxLength={500} value={noteText} onChange={(event)=>setNoteText(event.target.value)} placeholder="What did you notice? What would make you buy?" className="mt-3 min-h-32 w-full rounded-xl border border-border bg-background p-3"/><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{noteText.length}/500</span><button disabled={busy} onClick={()=>void saveNote()} className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">Save private note</button></div></>:null}</>}</div></section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><div className="flex items-center gap-3"><BarChart3 className="size-7 text-primary"/><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Reveal Lab</p><h2 className="mt-1 text-3xl font-black">Read your season</h2></div></div>{!owns('utility_reveal_lab')?<Locked copy="Unlock the Reveal Lab to measure consistency across your completed gameweeks."/>:!reveals.length?<p className="mt-4 text-sm text-muted-foreground">Your analysis begins after your first completed Reveal.</p>:<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><PlanMetric label="Weeks analysed" value={String(reveals.length)}/><PlanMetric label="Positive weeks" value={`${lab.positiveRate.toFixed(0)}%`}/><PlanMetric label="Average return" value={`${lab.average>=0?'+':''}${lab.average.toFixed(2)}%`}/><PlanMetric label="Best week" value={`${lab.best>=0?'+':''}${lab.best.toFixed(2)}%`}/><PlanMetric label="Toughest week" value={`${lab.worst>=0?'+':''}${lab.worst.toFixed(2)}%`} warn={lab.worst<0}/></div>}<p className="mt-4 text-xs text-muted-foreground"><Sparkles className="mr-1 inline size-4"/>History shown: {reveals.length} of {owns('utility_history_vault')?'up to 52':'up to 12'} gameweeks.</p></section>
  </div>
}

function PlayerComparison({player}:{player:MarketPlayer}){const change=player.current_value-player.previous_value;const ratings=player.matchweek_performance_history??[];const average=ratings.length?ratings.reduce((sum,row)=>sum+row.rating,0)/ratings.length:null;return <article className="rounded-2xl border border-border bg-background/70 p-4"><p className="flex items-center gap-2 font-black"><ClubColourDot clubName={player.club_name}/><span className="truncate">{player.display_name}</span></p><p className="mt-1 text-xs text-muted-foreground">{player.club_name} · {player.position}</p><p className="mt-3 text-lg font-black text-primary">{formatFiqCompact(player.current_value)}</p><p className={`mt-1 text-xs font-bold ${change>=0?'text-emerald-700':'text-rose-700'}`}>{change>=0?'+':'-'}{formatFiqCompact(Math.abs(change))} latest change</p><p className="mt-2 text-xs text-muted-foreground">Owned by {(player.ownership_percentage??0).toFixed(1)}% · Recent rating {average?.toFixed(2)??'Waiting'}</p></article>}
function Locked({copy}:{copy:string}){return <p className="mt-4 rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground"><LockKeyhole className="mr-2 inline size-4"/>{copy} <Link href="/market/rewards#reward-shop" className="font-bold text-primary underline underline-offset-4">See unlock</Link></p>}
function PlanMetric({label,value,warn=false}:{label:string;value:string;warn?:boolean}){return <div className={`rounded-xl border p-3 ${warn?'border-rose-300/25 bg-rose-950/60 text-rose-50':'border-border bg-background/70'}`}><p className={`text-xs ${warn?'text-rose-200/75':'text-muted-foreground'}`}>{label}</p><p className="mt-1 font-black">{value}</p></div>}
function DarkMetric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs text-emerald-50/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}
function buildRevealLab(reveals:MarketRevealSummary[]){const values=reveals.map((reveal)=>reveal.weekly_return_pct);return{average:values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length),positiveRate:(values.filter((value)=>value>0).length/Math.max(1,values.length))*100,best:values.length?Math.max(...values):0,worst:values.length?Math.min(...values):0}}
function SignedOutTools(){return <section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><Search className="size-9 text-primary"/><h1 className="mt-4 text-4xl font-black">Clubhouse tools</h1><p className="mt-3 max-w-2xl text-muted-foreground">Sign in to build your comparison desk, budget planner, scout notebook and Reveal Lab.</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground">Sign in</Link></section>}
