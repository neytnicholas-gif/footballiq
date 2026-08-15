'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Globe2, Loader2, Share2, Sparkles, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { footballLeagues } from '@/lib/football-leagues'
import { supabase } from '@/lib/supabase'

type ContentMode = 'all' | 'judgement' | 'quick_games' | 'league_world'
type ScoringMode = 'xp' | 'accuracy'
type Period = 'weekly' | 'monthly' | 'season' | 'all'
type QuizLeague = { id:string; league_code:string; name:string; owner_user_id:string; content_mode:ContentMode; scoring_mode:ScoringMode; period:Period; league_keys:string[]; role?:'owner'|'member' }
type QuizStanding = { user_id:string; username:string; score_value:number; accuracy_percent:number; xp_earned:number; quizzes_completed:number; rank:number }

const contentChoices: Record<ContentMode,{title:string;copy:string}> = {
  all:{title:'Everything',copy:'Every saved quiz and quick game counts.'},
  judgement:{title:'Football decisions',copy:'Tactics, scouting, referee and daily quizzes.'},
  quick_games:{title:'Quick games',copy:'Duels, careers, Who Am I and Higher or Lower.'},
  league_world:{title:'League World',copy:'Choose exactly which league rooms count.'},
}
const periodChoices: Record<Period,string> = {weekly:'This week',monthly:'This month',season:'This season',all:'All time'}

export function QuizFriendLeagues() {
  const { user } = useAuth()
  const [leagues,setLeagues]=useState<QuizLeague[]>([])
  const [tables,setTables]=useState<Record<string,QuizStanding[]>>({})
  const [name,setName]=useState('')
  const [joinCode,setJoinCode]=useState('')
  const [contentMode,setContentMode]=useState<ContentMode>('all')
  const [scoringMode,setScoringMode]=useState<ScoringMode>('xp')
  const [period,setPeriod]=useState<Period>('weekly')
  const [leagueKeys,setLeagueKeys]=useState<string[]>(footballLeagues.slice(0,4).map((league)=>league.key))
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!user){setLeagues([]);return}
    const {data:memberships,error:memberError}=await supabase.from('quiz_friend_league_members').select('league_id,role').eq('user_id',user.id)
    if(memberError)throw memberError
    if(!memberships?.length){setLeagues([]);return}
    const roleById=new Map(memberships.map((membership:{league_id:string;role:'owner'|'member'})=>[membership.league_id,membership.role]))
    const {data,error:leagueError}=await supabase.from('quiz_friend_leagues').select('*').in('id',memberships.map((membership)=>membership.league_id)).eq('is_active',true).order('created_at',{ascending:false})
    if(leagueError)throw leagueError
    setLeagues((data ?? []).map((league:QuizLeague)=>({...league,role:roleById.get(league.id)})))
  },[user])

  useEffect(()=>{const frame=requestAnimationFrame(()=>{void load().catch(()=>setError('Your quiz leagues could not load. Please refresh.'))});return()=>cancelAnimationFrame(frame)},[load])
  useEffect(()=>{const frame=requestAnimationFrame(()=>{const code=new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase();if(code)setJoinCode(code)});return()=>cancelAnimationFrame(frame)},[])

  async function createLeague(){
    if(!user)return setError('Sign in to make a quiz league.')
    if(name.trim().length<3)return setError('Use at least 3 letters for the league name.')
    if(contentMode==='league_world'&&!leagueKeys.length)return setError('Choose at least one League World room.')
    setBusy('create');setError('');setNotice('')
    const {data,error:createError}=await supabase.rpc('quiz_create_friend_league',{p_name:name.trim(),p_content_mode:contentMode,p_scoring_mode:scoringMode,p_period:period,p_league_keys:contentMode==='league_world'?leagueKeys:[]})
    if(createError)setError('That quiz league could not be made. Please try another name.')
    else{setName('');setNotice(`League ready. Share code ${String(data?.league_code ?? '')}.`);await load()}
    setBusy('')
  }

  async function joinLeague(){
    if(!user)return setError('Sign in to join a quiz league.')
    if(joinCode.length!==8)return setError('The invite code has 8 letters and numbers.')
    setBusy('join');setError('');setNotice('')
    const {error:joinError}=await supabase.rpc('quiz_join_friend_league',{p_league_code:joinCode})
    if(joinError)setError('That code did not match an open quiz league.')
    else{setJoinCode('');setNotice('You joined. Your saved scores now count in this table.');await load()}
    setBusy('')
  }

  async function showTable(league:QuizLeague){
    setBusy(league.id);setError('')
    const {data,error:tableError}=await supabase.rpc('quiz_get_friend_league_leaderboard',{p_league_id:league.id})
    if(tableError)setError('That table could not load.')
    else setTables((current)=>({...current,[league.id]:data ?? []}))
    setBusy('')
  }

  async function shareLeague(league:QuizLeague){
    const url=`${window.location.origin}/quizzes/leagues?join=${encodeURIComponent(league.league_code)}`
    if(navigator.share)await navigator.share({title:`Join ${league.name}`,text:`Join my Early Shout quiz league with code ${league.league_code}.`,url}).catch(()=>undefined)
    else{await navigator.clipboard.writeText(url);setNotice('Invite link copied. Send it to your friends.')}
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.2),transparent_30%),linear-gradient(140deg,#071827,#18234a)] p-5 shadow-xl sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200"><Users className="size-5"/></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Quiz mini leagues</p><h2 className="mt-1 text-3xl font-black text-white">Set the rules. Invite your people.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose what counts, how long the race lasts and what decides the winner. Everyone gets the same clear table.</p></div></div>
    </section>

    {error?<p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>:null}
    {notice?<p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100"><Check className="size-4"/>{notice}</p>:null}

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-[1.75rem] border border-slate-700 bg-slate-900/65 p-5 sm:p-6">
        <h3 className="text-xl font-black text-white">Create your league</h3>
        <label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-slate-400">League name<input value={name} maxLength={40} onChange={(event)=>setName(event.target.value)} placeholder="Monday Night Brains" className="mt-2 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-base font-medium normal-case tracking-normal text-white outline-none focus:border-cyan-300 sm:text-sm"/></label>
        <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">What counts?</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{(Object.entries(contentChoices) as [ContentMode,{title:string;copy:string}][]).map(([key,choice])=><button key={key} type="button" aria-pressed={contentMode===key} onClick={()=>setContentMode(key)} className={`rounded-xl border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${contentMode===key?'border-cyan-300 bg-cyan-300/10':'border-slate-700 bg-slate-950/50'}`}><span className="block font-bold text-white">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{choice.copy}</span></button>)}</div></fieldset>
        {contentMode==='league_world'?<fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Which league rooms?</legend><div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/45 p-3"><div className="flex flex-wrap gap-2">{footballLeagues.map((league)=>{const active=leagueKeys.includes(league.key);return <button key={league.key} type="button" aria-pressed={active} onClick={()=>setLeagueKeys((current)=>active?current.filter((key)=>key!==league.key):[...current,league.key])} className={`min-h-9 rounded-full border px-3 text-xs font-bold ${active?'border-cyan-300 bg-cyan-300 text-slate-950':'border-slate-700 text-slate-300'}`}>{league.shortName}</button>})}</div></div></fieldset>:null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Winner</legend><div className="mt-2 grid grid-cols-2 gap-2">{([['xp','Most XP'],['accuracy','Best accuracy']] as [ScoringMode,string][]).map(([key,label])=><button key={key} type="button" aria-pressed={scoringMode===key} onClick={()=>setScoringMode(key)} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${scoringMode===key?'border-fuchsia-300 bg-fuchsia-300/10 text-fuchsia-100':'border-slate-700 text-slate-400'}`}>{label}</button>)}</div></fieldset><fieldset><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Time</legend><select value={period} onChange={(event)=>setPeriod(event.target.value as Period)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm font-bold text-white">{Object.entries(periodChoices).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></fieldset></div>
        <button type="button" disabled={Boolean(busy)} onClick={()=>void createLeague()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-black text-slate-950 disabled:opacity-50">{busy==='create'?<Loader2 className="size-4 animate-spin"/>:<Sparkles className="size-4"/>}Create quiz league</button>
      </section>

      <section className="rounded-[1.75rem] border border-slate-700 bg-slate-900/65 p-5 sm:p-6"><h3 className="text-xl font-black text-white">Join a friend</h3><p className="mt-2 text-sm leading-6 text-slate-400">Paste the 8-character code they sent you.</p><input aria-label="Quiz league invite code" value={joinCode} maxLength={8} onChange={(event)=>setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} placeholder="AB12CD34" className="mt-4 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 text-center font-mono text-lg font-black tracking-[.2em] text-white"/><button type="button" disabled={Boolean(busy)} onClick={()=>void joinLeague()} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-sm font-black text-cyan-100 disabled:opacity-50">Join league</button><Link href="/quizzes/league-world" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 text-sm font-bold text-slate-300"><Globe2 className="size-4"/>Play League World</Link></section>
    </div>

    <section><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">Private tables</p><h3 className="mt-1 text-2xl font-black text-white">Your quiz leagues</h3></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">{leagues.length}</span></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{leagues.map((league)=>{const rows=tables[league.id];return <article key={league.id} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/65"><div className="border-b border-slate-700 bg-[linear-gradient(120deg,rgba(217,70,239,.12),rgba(34,211,238,.08))] p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-fuchsia-300">{contentChoices[league.content_mode].title} · {periodChoices[league.period]}</p><h4 className="mt-1 text-lg font-black text-white">{league.name}</h4></div><span className="h-fit rounded-lg bg-slate-950/60 px-2 py-1 font-mono text-xs font-black text-cyan-200">{league.league_code}</span></div><p className="mt-2 text-xs text-slate-400">Winner: {league.scoring_mode==='xp'?'most XP':'best accuracy'}{league.content_mode==='league_world'?` · ${league.league_keys.length} rooms`:''}</p></div><div className="p-4"><div className="flex flex-wrap gap-2"><button onClick={()=>void shareLeague(league)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-fuchsia-300 px-3 text-xs font-black text-slate-950"><Share2 className="size-3.5"/>Share</button><button onClick={()=>void showTable(league)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-600 px-3 text-xs font-black text-white"><Trophy className="size-3.5"/>{rows?'Refresh':'Show table'}</button><button aria-label={`Copy ${league.name} code`} onClick={()=>void navigator.clipboard.writeText(league.league_code)} className="grid size-10 place-items-center rounded-xl border border-slate-700 text-slate-300"><Copy className="size-3.5"/></button></div>{busy===league.id?<Loader2 className="mx-auto mt-5 size-5 animate-spin text-cyan-300"/>:null}{rows?<div className="mt-3 space-y-2">{rows.length?rows.map((row)=><div key={row.user_id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm"><span className="font-black text-slate-500">#{row.rank}</span><span className="truncate font-bold text-white">{row.username}</span><span className="font-black text-cyan-300">{league.scoring_mode==='xp'?`${row.xp_earned} XP`:`${row.accuracy_percent}%`}</span></div>):<p className="text-sm text-slate-400">No saved scores in this table yet.</p>}</div>:null}</div></article>})}</div>
      {!leagues.length?<div className="mt-3 rounded-2xl border border-dashed border-slate-700 p-7 text-center text-sm text-slate-400">No quiz leagues yet. Create one above, then share the code.</div>:null}
    </section>
  </div>
}
