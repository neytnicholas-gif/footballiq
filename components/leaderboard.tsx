import { Trophy } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

const users = [
  { rank: 1, name: 'refmaster', correct: 1842, accuracy: 94 },
  { rank: 2, name: 'offsideoracle', correct: 1710, accuracy: 91 },
  { rank: 3, name: 'var_verdict', correct: 1655, accuracy: 89 },
  { rank: 4, name: 'boot_room', correct: 1498, accuracy: 86 },
  { rank: 5, name: 'the_gaffer', correct: 1402, accuracy: 84 },
  { rank: 6, name: 'pitchside_pat', correct: 1350, accuracy: 82 },
  { rank: 7, name: 'cardcollector', correct: 1288, accuracy: 80 },
]

export function Leaderboard() {
  return (
    <section id="leaderboard" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          Leaderboard
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          The sharpest minds this season
        </h2>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground sm:px-6">
          <span>Rank</span>
          <span>Username</span>
          <span className="text-right">Correct</span>
          <span className="text-right">Accuracy</span>
        </div>

        <ul>
          {users.map((user) => {
            const isTop3 = user.rank <= 3
            return (
              <li
                key={user.rank}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/40 sm:px-6',
                  user.rank !== users.length && 'border-b border-border',
                )}
              >
                <span className="flex w-8 items-center justify-center">
                  {isTop3 ? (
                    <Trophy
                      className={cn(
                        'size-5',
                        user.rank === 1 && 'text-primary',
                        user.rank === 2 && 'text-primary/70',
                        user.rank === 3 && 'text-primary/50',
                      )}
                    />
                  ) : (
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {user.rank}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                    {user.name.slice(0, 2)}
                  </span>
                  <span className="text-sm font-medium">{user.name}</span>
                </span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  {user.correct.toLocaleString()}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums text-primary">
                  {user.accuracy}%
                </span>
              </li>
            )
          })}
        </ul>
      </Reveal>
    </section>
  )
}
