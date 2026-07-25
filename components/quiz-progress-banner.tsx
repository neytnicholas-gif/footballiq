type QuizProgressBannerProps = {
  title: string
  copy: string
  continueLabel?: string
  restartLabel?: string
  onContinue: () => void
  onStartAgain: () => void
}

export function QuizProgressBanner({
  title,
  copy,
  continueLabel = 'Continue where you left off',
  restartLabel = 'Start again',
  onContinue,
  onStartAgain,
}: QuizProgressBannerProps) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 shadow-[0_12px_35px_-20px_rgba(50,230,170,.7)]">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onContinue} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          {continueLabel}
        </button>
        <button onClick={onStartAgain} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold">
          {restartLabel}
        </button>
      </div>
    </div>
  )
}