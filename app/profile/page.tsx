'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'

export default function ProfilePage(){const router=useRouter();const{user,profile,loading}=useAuth();useEffect(()=>{if(!loading&&!user)router.replace('/login')},[loading,user,router]);return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-5xl px-4 py-14">{loading?<p>Loading…</p>:!profile?.username?<div className="rounded-3xl border border-border bg-card p-8"><h1 className="text-3xl font-semibold">Finish your profile</h1><Link href="/username" className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground">Choose username</Link></div>:<><h1 className="text-4xl font-semibold">{profile.username}</h1><p className="mt-2 text-muted-foreground">{user?.email}</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['XP',profile.xp],['Rating',profile.rating],['Completed',profile.quizzes_completed],['Best streak',profile.longest_streak],['Correct',profile.correct_answers],['Answers',profile.total_answers],['Perfect quizzes',profile.perfect_quizzes],['Level',Math.max(1,Math.floor(profile.xp/250)+1)]].map(([label,value])=><div key={label as string} className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold text-primary">{value}</p></div>)}</div><Link href="/username" className="mt-8 inline-block rounded-xl border border-border px-5 py-3">Edit username</Link></>}</section></main>}
