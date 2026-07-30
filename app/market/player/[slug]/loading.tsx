export default function MarketPlayerLoading() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-44 rounded-3xl bg-muted" />
          <div className="h-48 rounded-3xl bg-muted" />
        </div>
      </section>
    </main>
  )
}
