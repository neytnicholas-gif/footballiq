type QuizProgressBannerProps = {
  title: string
  copy: string
  continueLabel?: string
  restartLabel?: string
  onContinue: () => void
  onStartAgain: () => void
  tone?: 'default' | 'dark'
}

export function QuizProgressBanner({
  title,
  copy,
  continueLabel = 'Continue where you left off',
  restartLabel = 'Start again',
  onContinue,
  onStartAgain,
  tone = 'default',
}: QuizProgressBannerProps) {
  const isDark = tone === 'dark'
  return (
    <div className={isDark ? 'rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 shadow-[0_12px_35px_-20px_rgba(16,185,129,.75)]' : 'rounded-2xl border border-primary/25 bg-primary/10 p-4 shadow-[0_12px_35px_-20px_rgba(50,230,170,.7)]'}>
      <p className={isDark ? 'text-sm font-bold text-emerald-200' : 'text-sm font-semibold text-primary'}>{title}</p>
      <p className={isDark ? 'mt-1 text-sm text-slate-300' : 'mt-1 text-sm text-muted-foreground'}>{copy}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onContinue} className={isDark ? 'rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200' : 'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground'}>
          {continueLabel}
        </button>
        <button onClick={onStartAgain} className={isDark ? 'rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300' : 'rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold'}>
          {restartLabel}
        </button>
      </div>
    </div>
  )
}
