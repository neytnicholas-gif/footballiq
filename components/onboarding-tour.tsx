'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BarChart3, BookOpenCheck, Gamepad2, LineChart, Trophy } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { SITE_ONBOARDING_VERSION, START_SITE_TOUR_EVENT, isOnboardingRoute, onboardingStorageKey } from '@/lib/onboarding'

const steps = [
  {
    eyebrow: 'Welcome',
    title: 'Ready to build your team?',
    copy: 'Start with 100m free game credits. Pick players from England, Spain and France, then follow how their game values move—or take the short tour first.',
    tip: 'Market Credits are only for the game. They are not real money.',
    icon: LineChart,
    colours: 'from-emerald-400 to-cyan-400',
  },
  {
    eyebrow: 'Games and quizzes',
    title: 'Choose an answer. Learn straight away.',
    copy: 'Tap Games, pick a challenge and answer the questions. You see the answer after each choice, so every game teaches you something.',
    tip: 'Finishing games earns XP.',
    icon: Gamepad2,
    colours: 'from-sky-400 to-indigo-500',
  },
  {
    eyebrow: 'Player Market',
    title: 'Build an 11-player team with game credits.',
    copy: 'Choose players you think will perform well. Their Early Shout price can move after eligible match ratings arrive.',
    tip: 'Market Credits are only for the game. They are not real money.',
    icon: LineChart,
    colours: 'from-emerald-400 to-teal-600',
  },
  {
    eyebrow: 'Predictions',
    title: 'Pick what you think will happen.',
    copy: 'Choose match results before kick-off. Correct picks earn points, and you can compare scores with friends.',
    tip: 'Harder matches can be worth bonus points.',
    icon: BarChart3,
    colours: 'from-amber-400 to-orange-500',
  },
  {
    eyebrow: 'Your progress',
    title: 'XP raises your level. Big milestones raise your rank.',
    copy: 'Your overall level keeps growing. Ranks such as Football Fan and Talent Scout mark the bigger moments in your journey.',
    tip: 'Each level has its own colour through level 1,000.',
    icon: Trophy,
    colours: 'from-violet-500 to-fuchsia-500',
  },
  {
    eyebrow: 'You are ready',
    title: 'Start anywhere. You cannot break anything.',
    copy: 'Try a game first, or open How to Play whenever you want a simple reminder. We will keep your saved progress together.',
    tip: 'Look for “How to play” in the menu at any time.',
    icon: BookOpenCheck,
    colours: 'from-cyan-400 to-emerald-500',
  },
]

export function OnboardingTour() {
  const { user, profile, loading, profileLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    function restartTour() {
      setStepIndex(0)
      setOpen(true)
    }
    window.addEventListener(START_SITE_TOUR_EVENT, restartTour)
    return () => window.removeEventListener(START_SITE_TOUR_EVENT, restartTour)
  }, [])

  useEffect(() => {
    if (loading || profileLoading || !isOnboardingRoute(pathname)) return

    const storageKey = onboardingStorageKey(user?.id)
    const rememberedHere = window.localStorage.getItem(storageKey) === 'done'
    const rememberedByAccount = Boolean(user && (profile?.onboarding_version ?? 0) >= SITE_ONBOARDING_VERSION)
    if (rememberedHere || rememberedByAccount) return

    const timer = window.setTimeout(() => setOpen(true), 550)
    return () => window.clearTimeout(timer)
  }, [loading, pathname, profile?.onboarding_version, profileLoading, user])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function rememberCompletion() {
    window.localStorage.setItem(onboardingStorageKey(user?.id), 'done')
    if (user) {
      void supabase.rpc('complete_site_onboarding', { p_version: SITE_ONBOARDING_VERSION }).then(({ error }) => {
        if (error) console.warn('Could not sync onboarding completion:', error.message)
      })
    }
  }

  function dismiss() {
    rememberCompletion()
    setOpen(false)
  }

  function startPlaying() {
    dismiss()
    router.push('/market')
  }

  const step = steps[stepIndex]
  const StepIcon = step.icon
  const isLast = stepIndex === steps.length - 1

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); dismiss() }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100%-1.5rem))] overflow-y-auto rounded-[2rem] border border-white/15 bg-[#071b18] p-0 text-white shadow-[0_35px_100px_-25px_rgba(0,0,0,.8)] backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm"
      aria-labelledby="site-tour-title"
      aria-describedby="site-tour-description"
    >
      <div className="relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-52 bg-gradient-to-br ${step.colours} opacity-20 blur-3xl`} aria-hidden="true" />
        <div className="relative p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Quick tour · {stepIndex + 1} of {steps.length}</p>
            <button onClick={dismiss} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-100 underline decoration-white/40 underline-offset-4 transition hover:text-white">Skip tour</button>
          </div>

          <div className="mt-3 flex gap-1.5" role="progressbar" aria-label="Tour progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1}>
            {steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full transition ${index <= stepIndex ? 'bg-emerald-400' : 'bg-white/15'}`} />)}
          </div>

          <div className={`mt-8 grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${step.colours} text-slate-950 shadow-xl`}>
            <StepIcon className="size-8" aria-hidden="true" />
          </div>
          <p className="mt-7 text-sm font-bold text-emerald-300">{step.eyebrow}</p>
          <h2 id="site-tour-title" className="mt-2 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{step.title}</h2>
          <p id="site-tour-description" className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{step.copy}</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm font-semibold text-slate-100">
            Good to know: <span className="font-normal text-slate-200">{step.tip}</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 px-4 font-bold text-white transition hover:bg-white/10 disabled:invisible"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            {stepIndex === 0 ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStepIndex(1)} className="min-h-12 rounded-xl border border-white/15 px-4 font-bold text-white transition hover:bg-white/10">Show me around</button>
                <button autoFocus onClick={startPlaying} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-slate-950 shadow-[0_16px_36px_-18px_rgba(52,211,153,.95)] transition hover:-translate-y-0.5 hover:bg-emerald-300"><LineChart className="size-4" /> Open Player Market <ArrowRight className="size-4" /></button>
              </div>
            ) : isLast ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { dismiss(); router.push('/how-to-play') }} className="min-h-12 rounded-xl border border-white/15 px-4 font-bold text-white transition hover:bg-white/10">See all instructions</button>
                <button autoFocus onClick={startPlaying} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-slate-950 transition hover:bg-emerald-300">Build my team <ArrowRight className="size-4" /></button>
              </div>
            ) : (
              <button autoFocus onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-slate-950 transition hover:bg-emerald-300">Next <ArrowRight className="size-4" /></button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
