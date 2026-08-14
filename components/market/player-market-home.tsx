'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Award, BarChart3, Coins, DatabaseZap, Lock, Trophy, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { countFormation } from '@/lib/market/formation'
import { useAuth } from '@/components/auth-provider'
import { MarketDisclaimer } from '@/components/market/market-disclaimer'
import { MarketPlayerChip } from '@/components/market/market-player-chip'
import { ClubColourDot } from '@/components/market/club-colour-dot'
import { useMarketFormation } from '@/components/market/use-market-formation'
import {
  calculateTradesRemaining,
  loadMyLatestReveal,
  loadMyGameweekStatus,
  loadLatestMatchweekRun,
  loadMarketPlayers,
  loadMyPortfolioData,
} from '@/lib/market/client'
import {
  formatChange,
  formatFiqCompact,
  formatFiqLong,
  MARKET_MAX_PORTFOLIO_SIZE,
} from '@/lib/market/format'
import type { MarketHolding, MarketMatchweekRun, MarketPlayer, MarketPortfolio } from '@/lib/market/types'
import type { MarketGameweekStatus } from '@/lib/market/types'
import { MarketFirstMission } from '@/components/market/market-first-mission'
import { MarketMatchdayHub } from '@/components/market/market-matchday-hub'
import { MARKET_JOURNEY_EVENT, MarketJourneyTracker, marketJourneyKey } from '@/components/market/market-journey-tracker'

export function PlayerMarketHome() {
  const activeFormation = useMarketFormation()
  const formationLimits = activeFormation === '3-4-3' ? { GK: 1, DEF: 3, MID: 4, FWD: 3 } : { GK: 1, DEF: 4, MID: 3, FWD: 3 }
  const { user } = useAuth()
  const [players, setPlayers] = useState<MarketPlayer[]>([])
  const [portfolio, setPortfolio] = useState<MarketPortfolio | null>(null)
  const [holdings, setHoldings] = useState<MarketHolding[]>([])
  const [lastRun, setLastRun] = useState<MarketMatchweekRun | null>(null)
  const [latestRevealWeek, setLatestRevealWeek] = useState<string | null>(null)
  const [gameweekStatus, setGameweekStatus] = useState<MarketGameweekStatus | null>(null)
  const [journey, setJourney] = useState({ market: false, roster: false })
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [tradesMessage, setTradesMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const previewExperimentActive = useMemo(() => players.some((player) => player.data_source_label?.includes('preview valuation experiment')), [players])
  const previewPlayers = useMemo(() => players.filter((player) => player.data_source_label?.includes('preview valuation experiment')), [players])
  const previewBefore = useMemo(() => previewPlayers.reduce((total, player) => total + player.previous_value, 0), [previewPlayers])
  const previewAfter = useMemo(() => previewPlayers.reduce((total, player) => total + player.current_value, 0), [previewPlayers])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [{ data: playerRows, error: playerError }, portfolioData, latestRunData, gameweekStatus] = await Promise.all([
      loadMarketPlayers(),
      loadMyPortfolioData(),
      loadLatestMatchweekRun(),
      loadMyGameweekStatus(),
    ])

    if (playerError) {
      setError(playerError.message)
    }

    if (portfolioData.error) {
      setError(portfolioData.error.message)
    }

    if (latestRunData.error) {
      setError(latestRunData.error.message)
    }

    setPlayers(playerRows)
    setPortfolio(portfolioData.portfolio)
    setHoldings(portfolioData.holdings)
    setLastRun(latestRunData.data)
    setGameweekStatus(gameweekStatus.data)

    const remaining = calculateTradesRemaining(portfolioData.transactions)
    setTradesMessage(gameweekStatus.data
      ? `${gameweekStatus.data.signings_remaining}/11 signings left in ${gameweekStatus.data.label}`
      : `${remaining.buysRemaining} preview buys left today`)

    const revealResult = await loadMyLatestReveal()
    setLatestRevealWeek(revealResult.data?.week_label ?? null)

    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `fiq-market-onboarding-dismissed:${user?.id ?? 'anon'}`
    const stored = window.localStorage.getItem(key)
    const timer = window.setTimeout(() => setOnboardingDismissed(stored === '1'), 0)
    return () => window.clearTimeout(timer)
  }, [user])

  useEffect(() => {
    const readJourney = () => setJourney({
      market: window.localStorage.getItem(marketJourneyKey(user?.id, 'market')) === '1',
      roster: window.localStorage.getItem(marketJourneyKey(user?.id, 'roster')) === '1',
    })
    readJourney()
    window.addEventListener(MARKET_JOURNEY_EVENT, readJourney)
    return () => window.removeEventListener(MARKET_JOURNEY_EVENT, readJourney)
  }, [user])

  const movers = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.current_value - b.previous_value) - (a.current_value - a.previous_value))
    const risers = sorted.filter((player) => player.current_value > player.previous_value).slice(0, 4)
    const fallers = [...players]
      .filter((player) => player.current_value < player.previous_value)
      .sort((a, b) => (a.current_value - a.previous_value) - (b.current_value - b.previous_value))
      .slice(0, 4)
    return { risers, fallers }
  }, [players])

  const holdingsMap = useMemo(() => {
    const map = new Map<number, MarketHolding>()
    for (const holding of holdings) map.set(holding.player_id, holding)
    return map
  }, [holdings])

  const playersById = useMemo(() => new Map(players.map((entry) => [entry.id, entry])), [players])
  const formation = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])
  const isValidSquad = formation.GK === formationLimits.GK && formation.DEF === formationLimits.DEF && formation.MID === formationLimits.MID && formation.FWD === formationLimits.FWD
  const suggestedPosition = formation.GK < formationLimits.GK ? 'GK' : formation.DEF < formationLimits.DEF ? 'DEF' : formation.MID < formationLimits.MID ? 'MID' : formation.FWD < formationLimits.FWD ? 'FWD' : null
  const suggestedPlayers = useMemo(() => players.filter((player) => !holdingsMap.has(player.id) && (!suggestedPosition || player.position === suggestedPosition)).slice(0, 8), [players, holdingsMap, suggestedPosition])

  return (
    <div className="space-y-6">
      <MarketJourneyTracker userId={user?.id} />
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Early Shout flagship</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Early Shout Player Market</h1>
            <p className="mt-3 text-muted-foreground">
              Build an 11-player team. Buy players before you think their game price will rise. Sell them when you want to change your team.
            </p>
          </div>
          <Link href="/market/players" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Browse market
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/market/rewards" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary">
            <Award className="size-4" /> Challenges & rewards
          </Link>
        </div>

        {!onboardingDismissed ? (
          <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
            <p className="font-semibold">Pick players you think will play well and rise in game price.</p>
            <button
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold"
              onClick={() => {
                const key = `fiq-market-onboarding-dismissed:${user?.id ?? 'anon'}`
                window.localStorage.setItem(key, '1')
                setOnboardingDismissed(true)
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={<Wallet className="size-5" />} label="Total account value" value={portfolio ? formatFiqCompact(portfolio.total_account_value) : '100.0m VX'} sub={portfolio ? formatFiqLong(portfolio.total_account_value) : 'Create an account to track your market account'} />
          <SummaryCard icon={<Coins className="size-5" />} label="Available balance" value={portfolio ? formatFiqCompact(portfolio.available_balance) : '100.0m VX'} sub={portfolio ? `Starting balance ${formatFiqCompact(portfolio.starting_balance)}` : 'No cash purchases. No withdrawals.'} />
          <SummaryCard icon={<BarChart3 className="size-5" />} label="Portfolio value" value={portfolio ? formatFiqCompact(portfolio.portfolio_value) : '0.0m VX'} sub={portfolio ? `${holdings.length}/${MARKET_MAX_PORTFOLIO_SIZE} slots used` : '11-player portfolio target'} />
          <SummaryCard icon={<TrendingUp className="size-5" />} label="Realised game gain/loss" value={portfolio ? formatChange(portfolio.realized_profit_loss) : '0'} sub={tradesMessage || '11 new signings available each gameweek'} />
        </div>

        <div className="mt-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-xs text-muted-foreground">
          {activeFormation} status: GK {formation.GK}/{formationLimits.GK} · DEF {formation.DEF}/{formationLimits.DEF} · MID {formation.MID}/{formationLimits.MID} · FWD {formation.FWD}/{formationLimits.FWD}
        </div>

        <div className="mt-5">
          <MarketDisclaimer />
        </div>
      </section>

      <MarketFirstMission visitedMarket={journey.market} hasFirstPlayer={holdings.length > 0} hasFullTeam={isValidSquad} visitedRoster={journey.roster} />

      <MarketMatchdayHub status={gameweekStatus} hasFullTeam={isValidSquad} latestRevealWeek={latestRevealWeek} />

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Price update status</p>
              <h2 className="mt-1 text-2xl font-black">{previewExperimentActive ? '11-player price test is live' : players.some((player) => player.current_value !== player.opening_season_value) ? 'Gameweek price changes are live' : 'The opening market is live'}</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{previewExperimentActive ? 'We are testing 11 players with the same rules the full game uses. Test results stay clearly marked and never pretend to be a real match.' : 'After each gameweek, real ratings and minutes update game prices. If a player has no trusted match data, their price stays the same.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/20 bg-emerald-700/10 px-4 py-2.5 text-sm font-semibold text-emerald-900"><DatabaseZap className="size-4" /> {previewExperimentActive ? 'Clearly marked test data' : 'Live squad data'}</span>
              <Link href="/market/reveal" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
                Open The Reveal
              </Link>
            </div>
          </div>
          {!isValidSquad ? <p className="mt-3 text-xs text-emerald-800">Finish your {activeFormation} team before the next price update.</p> : null}
          {latestRevealWeek ? <p className="mt-2 text-xs text-muted-foreground">Latest Reveal available: {latestRevealWeek}</p> : null}

          {lastRun ? (
            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              Preview history: {lastRun.week_label} · Weekly {lastRun.weekly_portfolio_gain >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(lastRun.weekly_portfolio_gain))} · game return {lastRun.current_roi_pct.toFixed(2)}%. This is not a verified real-performance update.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">The season has not produced a price update yet. Prices will start moving after finished matches give us player ratings and minutes.</div>
          )}
      </section>

      {previewExperimentActive ? (
        <section className="rounded-[2rem] border border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 text-slate-950 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-amber-800">Isolated engine proof · not your account</p>
              <h2 className="mt-1 text-2xl font-black">Complete 1-4-3-3 valuation trial</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">Eleven controlled ratings have been processed by the production valuation formula. Test players are trade-locked, so this proof cannot alter your cash, holdings, leaderboard rank, or transaction history.</p>
            </div>
            <span className="rounded-xl border border-emerald-700/20 bg-emerald-700/10 px-4 py-2 text-sm font-bold text-emerald-900">{previewPlayers.length}/11 players processed</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<Coins className="size-5" />} label="Squad before" value={formatFiqCompact(previewBefore)} sub="Opening game prices" />
            <SummaryCard icon={<TrendingUp className="size-5" />} label="Squad after" value={formatFiqCompact(previewAfter)} sub="Rating + minutes applied" />
            <SummaryCard icon={<BarChart3 className="size-5" />} label="Total price change" value={formatChange(previewAfter - previewBefore)} sub="Players can rise, fall or stay the same" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previewPlayers.map((player) => {
              const delta = player.current_value - player.previous_value
              return (
                <Link key={player.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 transition hover:border-emerald-500">
                  <span className="flex min-w-0 items-center gap-2"><ClubColourDot clubName={player.club_name} /><strong className="truncate">{player.display_name}</strong><span className="text-xs text-slate-500">{player.position}</span></span>
                  <span className={delta > 0 ? 'font-bold text-emerald-700' : delta < 0 ? 'font-bold text-red-700' : 'font-bold text-slate-600'}>{delta > 0 ? '+' : delta < 0 ? '−' : ''}{formatFiqCompact(Math.abs(delta))}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!user ? (
        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Anonymous Market mode is active.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your guest team is saved on this device. Create an account to keep it when you switch devices.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && holdings.length === 0 ? (
        <section className="rounded-[2rem] border border-primary/25 bg-primary/10 p-6 sm:p-8">
          <h2 className="text-2xl font-black">Fast start: make your first squad signing in under 30 seconds</h2>
          <p className="mt-2 text-sm text-muted-foreground">Formation is strict: 1 GK, 4 DEF, 3 MID, 3 FWD. Start with a goalkeeper and core defenders, then complete midfield and attack.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/market/players" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open player marketplace</Link>
            <Link href="/market/roster" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">View empty roster</Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Current holdings</h2>
            <Link href="/market/roster" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open roster</Link>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading your players…</p> : holdings.length === 0 ? <p className="text-sm text-muted-foreground">You have no players yet. Start building your 11-player team.</p> : (
            <div className="space-y-3">
              {holdings.map((holding) => {
                const player = players.find((candidate) => candidate.id === holding.player_id)
                if (!player) return null
                return (
                  <div key={holding.id} className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3">
                    <div className="flex items-center gap-3">
                      <MarketPlayerChip player={player} />
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><ClubColourDot clubName={player.club_name} /><span>{player.display_name}</span></p>
                        <p className="text-xs text-muted-foreground">{player.club_name} · {player.position}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>{formatFiqCompact(holding.current_value_snapshot)}</p>
                      <p className={holding.unrealized_profit_loss >= 0 ? 'text-primary' : 'text-destructive'}>
                        {holding.unrealized_profit_loss >= 0 ? '+' : ''}{formatFiqCompact(holding.unrealized_profit_loss)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Market movers</h2>
            <Link href="/market/players" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open marketplace</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-primary">Top risers</p>
              <div className="space-y-2">
                {movers.risers.length === 0 ? <p className="rounded-xl border border-border bg-background/60 px-3 py-3 text-xs text-muted-foreground">Waiting for the first verified movement.</p> : null}
                {movers.risers.map((player) => (
                  <MoverRow key={player.id} player={player} positive />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-destructive">Top fallers</p>
              <div className="space-y-2">
                {movers.fallers.length === 0 ? <p className="rounded-xl border border-border bg-background/60 px-3 py-3 text-xs text-muted-foreground">No verified fallers yet.</p> : null}
                {movers.fallers.map((player) => (
                  <MoverRow key={player.id} player={player} positive={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Social pulse</h2>
          <Link href="/market/leaderboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">See leaderboard</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SocialStub icon={<Trophy className="size-4" />} title="Top Traders" value="Coming live in Phase 2" hint="Highest average return over last 14 days" />
          <SocialStub icon={<Wallet className="size-4" />} title="Highest Portfolio" value="Coming live in Phase 2" hint="Largest total account value this week" />
          <SocialStub icon={<TrendingUp className="size-4" />} title="Biggest Weekly Gain" value="Coming live in Phase 2" hint="Strongest week-on-week performance" />
          <SocialStub icon={<Coins className="size-4" />} title="Biggest Game Gain" value="Coming live in Phase 2" hint="Largest realised VX Credit gain" />
          <SocialStub icon={<Users className="size-4" />} title="Friends" value="Coming live in Phase 2" hint="Invite friends and build private leagues" />
          <SocialStub icon={<BarChart3 className="size-4" />} title="Market Leaderboard" value="Live now" hint="Track daily, weekly and season performance" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="text-xl font-bold">{suggestedPosition ? `Suggested ${suggestedPosition} options` : 'Explore the player pool'}</h2><p className="mt-1 text-xs text-muted-foreground">{suggestedPosition ? `Matches the next open position in your ${activeFormation} roster.` : 'Your roster is complete; compare alternatives before making a change.'}</p></div>
          <div className="flex items-center gap-4">
            <Link href="/market/leagues" className="text-sm font-semibold text-primary">Friends leagues beta</Link>
            <Link href="/market/leaderboard" className="text-sm font-semibold text-primary">Market leaderboard</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {suggestedPlayers.map((player) => {
            const owned = holdingsMap.has(player.id)
            return (
              <Link key={player.id} href={`/market/player/${encodeURIComponent(player.slug)}`} className="rounded-2xl border border-border bg-background/60 p-3 transition hover:border-primary/45">
                <div className="flex items-start justify-between gap-3">
                  <MarketPlayerChip player={player} />
                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{player.position}</span>
                </div>
                <p className="mt-3 flex items-center gap-2 font-semibold"><ClubColourDot clubName={player.club_name} /><span>{player.display_name}</span></p>
                <p className="text-xs text-muted-foreground">{player.club_name}</p>
                <p className="mt-2 text-sm text-primary">{formatFiqCompact(player.current_value)}</p>
                <p className="text-xs text-muted-foreground">{owned ? 'In your team' : 'See player details'}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Supporting football modes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Build your team in Player Market, or try one of the free football games below.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/quizzes/would-you-scout-him" className="rounded-xl border border-border px-4 py-2">Scout Vision</Link>
          <Link href="/quizzes/referee-decisions" className="rounded-xl border border-border px-4 py-2">Referee Arena</Link>
          <Link href="/quizzes/football-duels" className="rounded-xl border border-border px-4 py-2">Football Duels</Link>
          <Link href="/daily" className="rounded-xl border border-border px-4 py-2">Daily Challenge</Link>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function MoverRow({ player, positive }: { player: MarketPlayer; positive: boolean }) {
  const delta = player.current_value - player.previous_value
  const icon = positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />
  return (
    <Link href={`/market/player/${encodeURIComponent(player.slug)}`} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2 pr-3"><ClubColourDot clubName={player.club_name} /><span className="truncate">{player.display_name}</span></span>
      <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-primary' : 'text-destructive'}`}>
        {icon}
        {delta >= 0 ? '+' : ''}{formatFiqCompact(Math.abs(delta))}
      </span>
    </Link>
  )
}

function SocialStub({ icon, title, value, hint }: { icon: ReactNode; title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[.16em] text-muted-foreground">{icon}{title}</p>
      <p className="mt-2 text-sm font-semibold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
