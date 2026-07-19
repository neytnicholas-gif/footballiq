'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { supabase, type Profile } from '@/lib/supabase'

export default function LeaderboardPage(){
  const [players,setPlayers]=useState<Profile[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{void(async()=>{const {data}=await supabase.from('profiles').select('*').not('username','is',null).order('xp',{ascending:false}).limit(50);setPlayers((data as Profile[])??[]);setLoading(false)})()},[])
  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-4xl px-4 py-14"><p className="text-sm uppercase tracking-widest text-primary">Leaderboard</p><h1 className="mt-3 text-4xl font-semibold">Top FootballIQ players</h1><div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">{loading?<p className="p-6 text-muted-foreground">Loading…</p>:players.length===0?<p className="p-6 text-muted-foreground">No ranked players yet.</p>:players.map((p,i)=><div key={p.id} className="grid grid-cols-[50px_1fr_auto] items-center gap-4 border-b border-border p-5 last:border-0"><span className="text-muted-foreground">#{i+1}</span><div><p className="font-semibold">{p.username}</p><p className="text-xs text-muted-foreground">{p.quizzes_completed} quizzes completed</p></div><p className="font-semibold text-primary">{p.xp} XP</p></div>)}</div></section></main>
}
