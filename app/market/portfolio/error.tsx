'use client'

export default function MarketPortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h1 className="text-3xl font-bold">Portfolio temporarily unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred while loading your portfolio.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </section>
    </main>
  )
}
