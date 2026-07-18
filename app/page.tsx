'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import { LevelBadge } from '@/components/level-badge'
import { XpProgress } from '@/components/xp-progress'
import { ModeCard } from '@/components/mode-card'
import { ComingSoonCard } from '@/components/coming-soon-card'
import { getLevelFromXp } from '@/lib/progression'

export default function HomePage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="h-48 animate-pulse rounded-3xl bg-secondary/60" />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Football<span className="text-primary">IQ</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Sign in
              </Link>

              <Link
                href="/signup"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Create account
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center px-4 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Test your football brain
            </p>

            <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-7xl">
              Build your
              <br />
              Football<span className="text-primary">IQ</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Play football challenges, test your knowledge and build a
              FootballIQ profile that develops as you play.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-primary px-6 py-3 font-medium text-background"
              >
                Start playing
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-border px-6 py-3 font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />

        <div className="mx-auto max-w-3xl px-4 pt-32">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h1 className="text-3xl font-bold">Finish your FootballIQ profile</h1>

            <p className="mt-3 text-muted-foreground">
              Choose your public username before you start playing.
            </p>

            <Link
              href="/username"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-medium text-background"
            >
              Choose username
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const xp = profile.xp ?? 0
  const level = getLevelFromXp(xp)

  const currentStreak =
    'current_streak' in profile && typeof profile.current_streak === 'number'
      ? profile.current_streak
      : 0

  const quizzesCompleted =
    'quizzes_completed' in profile &&
    typeof profile.quizzes_completed === 'number'
      ? profile.quizzes_completed
      : 0

  const perfectQuizzes =
    'perfect_quizzes' in profile &&
    typeof profile.perfect_quizzes === 'number'
      ? profile.perfect_quizzes
      : 0

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-28">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Welcome back
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LevelBadge level={level} size="lg" showLabel />

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {profile.username || 'Player'}
            </h1>
          </div>

          <div className="mt-8">
            <XpProgress totalXp={xp} showValues size="lg" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total XP" value={xp.toLocaleString()} />
            <StatCard label="Streak" value={`${currentStreak} days`} />
            <StatCard label="Quizzes" value={quizzesCompleted.toLocaleString()} />
            <StatCard label="Perfect scores" value={perfectQuizzes.toLocaleString()} />
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Continue playing
            </p>

            <h2 className="mt-2 text-3xl font-bold">Test your FootballIQ</h2>
          </div>

          <ModeCard
            title="Premier League Goals Duel"
            description="Who scored more Premier League goals? Eleven head-to-head player battles."
            href="/quizzes/football-duels"
            isClickable
          />
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-3xl font-bold">Game modes</h2>

            <p className="mt-2 text-muted-foreground">
              Different ways to test how well you really know football.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ModeCard
              title="Football Duels"
              description="Head-to-head football questions where one answer has the edge."
              href="/quizzes/football-duels"
              isClickable
            />

            <ComingSoonCard
              title="Higher or Lower"
              description="Build the longest possible streak by judging football statistics."
            />

            <ComingSoonCard
              title="Who Am I?"
              description="Identify the player while each extra clue reduces the reward."
            />

            <ComingSoonCard
              title="Career Path"
              description="Identify players from the clubs they represented."
            />

            <ComingSoonCard
              title="Referee Decisions"
              description="Cards, fouls, DOGSO and Law of the Game scenarios."
            />

            <ComingSoonCard
              title="Would You Scout Him?"
              description="Assess anonymous player profiles and make a scouting decision."
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ComingSoonCard
            title="Today's FootballIQ"
            description="A five-question mixed challenge designed to keep your daily streak alive."
          />

          <Link
            href="/predictions"
            className="rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Predictions
            </p>

            <h3 className="mt-3 text-2xl font-bold">Prediction Challenges</h3>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Explore the predictions area and see what is coming to FootballIQ.
            </p>
          </Link>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold">Your progress</h2>
              <p className="mt-2 text-muted-foreground">
                Build a profile that reflects how you play.
              </p>
            </div>

            <Link
              href="/profile"
              className="text-sm font-medium text-primary hover:underline"
            >
              View full profile
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Current rating"
              value={(profile.rating ?? 1000).toLocaleString()}
            />

            <StatCard
              label="Level"
              value={level.toLocaleString()}
            />

            <StatCard
              label="XP earned"
              value={xp.toLocaleString()}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}