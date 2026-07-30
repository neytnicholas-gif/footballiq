export default function MarketLoading() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-72 rounded-3xl bg-muted" />
        </div>
      </section>
    </main>
  )
}
