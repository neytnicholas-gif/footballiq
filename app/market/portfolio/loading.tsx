export default function MarketPortfolioLoading() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded bg-muted" />
          <div className="h-36 rounded-3xl bg-muted" />
          <div className="h-56 rounded-3xl bg-muted" />
        </div>
      </section>
    </main>
  )
}
