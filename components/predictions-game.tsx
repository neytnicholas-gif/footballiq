'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  Coins,
  Copy,
  Crown,
  Loader2,
  LockKeyhole,
  LogOut,
  Medal,
  Plus,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { footballLeagues } from '@/lib/football-leagues'
import { supabase } from '@/lib/supabase'

type Pick = 'home' | 'draw' | 'away'
type Tab = 'picks' | 'leagues' | 'standings'
type Period = 'daily' | 'weekly' | 'monthly' | 'season' | 'all'
type Scope = 'global' | 'country' | 'continent'
type RuleMode = 'all' | 'random_1' | 'random_5'
type RankingMode = 'points' | 'correct' | 'confidence'
type Fixture = {
  fixture_id: string
  league_key: string
  league_name: string
  gameweek_key: string
  home_team: string
  away_team: string
  kickoff_at: string
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  home_score: number | null
  away_score: number | null
  is_derby: boolean
}
type SavedPrediction = {
  fixture_id: string
  pick: Pick
  confidence: number
  points_awarded: number | null
  scored_at: string | null
}
type PredictionLeague = {
  id: string
  league_code: string
  name: string
  owner_user_id: string
  rule_mode: RuleMode
  league_keys: string[]
  ranking_mode: RankingMode
  is_active: boolean
  created_at: string
  role?: 'owner' | 'member'
}
type LeagueAction = { league: PredictionLeague; kind: 'leave' | 'delete' }
type Standing = {
  user_id: string
  username: string
  points: number
  picks_scored: number
  correct_picks: number
  rank?: number
  confidence_won?: number
}

type CompetitionOption = { key: string; label: string; country: string }

const leagueColours = ['bg-violet-500','bg-rose-500','bg-sky-500','bg-amber-400','bg-emerald-400','bg-fuchsia-400','bg-orange-400','bg-cyan-400']
function leagueColour(key: string) {
  const total = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return leagueColours[total % leagueColours.length]
}

const leagueOptions = footballLeagues.map((league) => ({
  key: league.key,
  label: league.shortName,
  colour: leagueColour(league.key),
}))

const rankingLabels: Record<RankingMode,{title:string;copy:string}> = {
  points:{title:'Total points',copy:'All match points and bonuses count.'},
  correct:{title:'Most right',copy:'The most correct 1, X or 2 calls wins.'},
  confidence:{title:'Brave calls',copy:'Correct high-confidence picks lead the table.'},
}

// Keep the established key so returning beta players do not lose their local record.
const PREDICTION_HISTORY_KEY = 'footballiq-prediction-history'
const INITIAL_FIXTURE_COUNT = 12
const FIXTURE_PAGE_SIZE = 12

const ruleLabels: Record<RuleMode, { title: string; copy: string }> = {
  all: { title: 'Every match', copy: 'Your table counts every match from the leagues you choose.' },
  random_1: { title: 'One match', copy: 'Everyone gets the same one match from each gameweek.' },
  random_5: { title: 'Five matches', copy: 'Everyone gets the same five-match challenge each gameweek.' },
}

const periodLabels: Record<Period, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
  season: 'This season',
  all: 'All time',
}

const continentOptions = [
  ['AF', 'Africa'], ['AS', 'Asia'], ['EU', 'Europe'], ['NA', 'North America'],
  ['OC', 'Oceania'], ['SA', 'South America'], ['AN', 'Antarctica'],
] as const

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function pickLabel(pick: Pick) {
  return pick === 'home' ? '1' : pick === 'draw' ? 'X' : '2'
}

function pickName(pick: Pick, fixture: Fixture) {
  return pick === 'home' ? fixture.home_team : pick === 'away' ? fixture.away_team : 'Draw'
}

export function PredictionsGame() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('picks')
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [saved, setSaved] = useState<Record<string, SavedPrediction>>({})
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [leagues, setLeagues] = useState<PredictionLeague[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [leagueStandings, setLeagueStandings] = useState<Record<string, Standing[]>>({})
  const [period, setPeriod] = useState<Period>('weekly')
  const [scope, setScope] = useState<Scope>('global')
  const [location, setLocation] = useState({ country: '', continent: '', shared: false })
  const [leagueName, setLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [ruleMode, setRuleMode] = useState<RuleMode>('all')
  const [rankingMode, setRankingMode] = useState<RankingMode>('points')
  const [competitionOptions, setCompetitionOptions] = useState<CompetitionOption[]>([])
  const [leagueKeys, setLeagueKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [fixtureLeague, setFixtureLeague] = useState('all')
  const [visibleFixtureCount, setVisibleFixtureCount] = useState(INITIAL_FIXTURE_COUNT)
  const [leagueAction, setLeagueAction] = useState<LeagueAction | null>(null)

  const loadLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([])
      return
    }
    const { data: memberships, error: membershipError } = await supabase
      .from('prediction_league_members')
      .select('league_id,role')
      .eq('user_id', user.id)
    if (membershipError) throw membershipError
    if (!memberships?.length) {
      setLeagues([])
      return
    }
    const roleByLeague = new Map(memberships.map((membership) => [membership.league_id, membership.role]))
    const { data, error: leagueError } = await supabase
      .from('prediction_leagues')
      .select('*')
      .in('id', memberships.map((membership) => membership.league_id))
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (leagueError) throw leagueError
    setLeagues((data ?? []).map((league) => ({ ...league, role: roleByLeague.get(league.id) })))
  }, [user])

  const loadStandings = useCallback(async (nextPeriod: Period, nextScope: Scope = 'global', scopeValue = '') => {
    const { data, error: standingsError } = await supabase.rpc('prediction_get_public_leaderboard', {
      p_period: nextPeriod,
      p_scope: nextScope,
      p_scope_value: nextScope === 'global' ? null : scopeValue,
    })
    if (standingsError) throw standingsError
    setStandings((data ?? []).map((row, index) => ({ ...row, rank: index + 1 })))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const now = new Date()
      const historyStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data: competitionRows, error: competitionError } = await supabase
        .from('prediction_competitions')
        .select('league_key,league_name,country_name')
        .eq('is_active', true)
        .order('league_name')
      if (competitionError) throw competitionError
      const nextCompetitionOptions = (competitionRows ?? []).map((competition) => ({
        key: competition.league_key,
        label: competition.league_name,
        country: competition.country_name ?? 'International',
      }))
      setCompetitionOptions(nextCompetitionOptions)
      setLeagueKeys((current) => {
        const available = new Set(nextCompetitionOptions.map((competition) => competition.key))
        const kept = current.filter((key) => available.has(key))
        return kept.length ? kept : [...available]
      })
      const { data: fixtureRows, error: fixtureError } = await supabase
        .from('prediction_fixtures')
        .select('fixture_id,league_key,league_name,gameweek_key,home_team,away_team,kickoff_at,status,home_score,away_score,is_derby')
        .gte('kickoff_at', historyStart)
        .not('status', 'in', '(cancelled,postponed)')
        .order('kickoff_at', { ascending: true })
        .limit(120)
      if (fixtureError) throw fixtureError
      const activeCompetitionKeys = new Set(nextCompetitionOptions.map((competition) => competition.key))
      setFixtures((fixtureRows ?? []).filter((fixture) => activeCompetitionKeys.has(fixture.league_key)))

      if (user) {
        const { data: predictionRows, error: predictionError } = await supabase
          .from('predictions')
          .select('fixture_id,pick,confidence,points_awarded,scored_at')
          .eq('user_id', user.id)
        if (predictionError) throw predictionError
        const predictionMap = Object.fromEntries((predictionRows ?? []).map((row) => [row.fixture_id, row]))
        setSaved(predictionMap)
        setPicks(Object.fromEntries((predictionRows ?? []).map((row) => [row.fixture_id, row.pick])))
        setConfidence(Object.fromEntries((predictionRows ?? []).map((row) => [row.fixture_id, row.confidence])))
        const { data: settings } = await supabase.from('prediction_player_settings').select('country_code,continent_code,share_location').eq('user_id', user.id).maybeSingle()
        if (settings) setLocation({ country: settings.country_code ?? '', continent: settings.continent_code ?? '', shared: settings.share_location })
      } else {
        setSaved({})
      }

      await Promise.all([loadLeagues(), loadStandings('weekly', 'global')])
    } catch (loadError) {
      console.error(loadError)
      setError('This page could not load everything. Please refresh and try once more.')
    } finally {
      setLoading(false)
    }
  }, [loadLeagues, loadStandings, user])

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (!active) return
      setLoading(false)
      setError('Fixtures are taking longer than expected. Please refresh once. If no matches are ready yet, check back before the next gameweek.')
    }, 10_000)

    const loadTimeout = window.setTimeout(() => {
      void load().finally(() => window.clearTimeout(timeout))
    }, 0)
    return () => {
      active = false
      window.clearTimeout(loadTimeout)
      window.clearTimeout(timeout)
    }
  }, [load])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase()
    if (!code) return
    const timeout = window.setTimeout(() => {
      setJoinCode(code)
      setTab('leagues')
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now())
    const timeout = window.setTimeout(updateClock, 0)
    const interval = window.setInterval(updateClock, 60_000)
    return () => { window.clearTimeout(timeout); window.clearInterval(interval) }
  }, [])

  const upcoming = useMemo(() => fixtures.filter((fixture) => fixture.status === 'scheduled' && (currentTime === 0 || new Date(fixture.kickoff_at).getTime() > currentTime)), [currentTime, fixtures])
  const recent = useMemo(() => fixtures.filter((fixture) => fixture.status === 'completed').slice(-12).reverse(), [fixtures])
  const upcomingLeagueOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const fixture of upcoming) {
      const current = counts.get(fixture.league_key)
      counts.set(fixture.league_key, {
        label: fixture.league_name,
        count: (current?.count ?? 0) + 1,
      })
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [upcoming])
  const activeFixtureLeague = fixtureLeague === 'all' || upcoming.some((fixture) => fixture.league_key === fixtureLeague) ? fixtureLeague : 'all'
  const filteredUpcoming = useMemo(
    () => activeFixtureLeague === 'all' ? upcoming : upcoming.filter((fixture) => fixture.league_key === activeFixtureLeague),
    [activeFixtureLeague, upcoming],
  )
  const visibleUpcoming = filteredUpcoming.slice(0, visibleFixtureCount)
  const unsavedCount = upcoming.filter((fixture) => picks[fixture.fixture_id] && (
    picks[fixture.fixture_id] !== saved[fixture.fixture_id]?.pick
    || (confidence[fixture.fixture_id] ?? 3) !== saved[fixture.fixture_id]?.confidence
  )).length

  async function savePicks() {
    if (!user) {
      setError('Sign in first, then your picks can be saved and scored.')
      return
    }
    const changed = upcoming
      .filter((fixture) => picks[fixture.fixture_id] && (
        picks[fixture.fixture_id] !== saved[fixture.fixture_id]?.pick
        || (confidence[fixture.fixture_id] ?? 3) !== saved[fixture.fixture_id]?.confidence
      ))
      .map((fixture) => ({
        fixture_id: fixture.fixture_id,
        pick: picks[fixture.fixture_id],
        confidence: confidence[fixture.fixture_id] ?? 3,
      }))
    if (!changed.length) return
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.rpc('prediction_save_picks', { p_picks: changed })
    if (saveError) setError(saveError.message.includes('PICKS_LOCKED') ? 'One of those matches has started. Refresh to see what is still open.' : 'Your picks were not saved. Please try again.')
    else {
      try {
        const previous = JSON.parse(localStorage.getItem(PREDICTION_HISTORY_KEY) ?? '[]') as Array<{ set: string; picks: number }>
        const set = upcoming.find((fixture) => changed.some((pick) => pick.fixture_id === fixture.fixture_id))?.gameweek_key ?? new Date().toISOString().slice(0, 10)
        const next = [{ set, picks: changed.length }, ...previous.filter((item) => item.set !== set)].slice(0, 12)
        localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(next))
      } catch {
        // A blocked or malformed local store must never stop a server save.
      }
      setNotice(`${changed.length} ${changed.length === 1 ? 'pick' : 'picks'} saved. You can change them until kickoff.`)
      setSaved((current) => {
        const next = { ...current }
        for (const pick of changed) {
          next[pick.fixture_id] = {
            fixture_id: pick.fixture_id,
            pick: pick.pick as Pick,
            confidence: pick.confidence,
            points_awarded: current[pick.fixture_id]?.points_awarded ?? null,
            scored_at: current[pick.fixture_id]?.scored_at ?? null,
          }
        }
        return next
      })
    }
    setSaving(false)
  }

  async function createLeague() {
    if (!user) return setError('Sign in to make a league for your friends.')
    if (leagueName.trim().length < 3) return setError('Give your league a name with at least 3 letters.')
    if (!leagueKeys.length) return setError('Choose at least one football league.')
    setWorking(true)
    setError('')
    const { error: createError } = await supabase.rpc('prediction_create_league', {
      p_name: leagueName.trim(),
      p_rule_mode: ruleMode,
      p_league_keys: leagueKeys,
      p_ranking_mode: rankingMode,
    })
    if (createError) setError('That league could not be made. Please check the name and try again.')
    else {
      setLeagueName('')
      setNotice('Your league is ready. Share its code or invite link with friends.')
      await loadLeagues()
    }
    setWorking(false)
  }

  async function joinLeague() {
    if (!user) return setError('Sign in before joining a friend league.')
    if (joinCode.trim().length !== 8) return setError('A league code has 8 letters and numbers.')
    setWorking(true)
    setError('')
    const { error: joinError } = await supabase.rpc('prediction_join_league', { p_league_code: joinCode.trim().toUpperCase() })
    if (joinError) setError('That code did not match an open league.')
    else {
      setJoinCode('')
      setNotice('You joined the league. Your scored picks will appear in its table.')
      await loadLeagues()
    }
    setWorking(false)
  }

  async function completeLeagueAction() {
    if (!leagueAction) return
    const { league, kind } = leagueAction
    setWorking(true)
    setError('')
    setNotice('')
    const { error: actionError } = kind === 'delete'
      ? await supabase.rpc('prediction_delete_league', { p_league_id: league.id })
      : await supabase.rpc('prediction_leave_league', { p_league_id: league.id })
    if (actionError) {
      setError(kind === 'delete' ? 'That league could not be deleted. Only its owner can delete it.' : 'You could not leave that league. Please try again.')
    } else {
      setLeagues((current) => current.filter((item) => item.id !== league.id))
      setLeagueStandings((current) => { const next = { ...current }; delete next[league.id]; return next })
      setNotice(kind === 'delete' ? `${league.name} was deleted for everyone.` : `You left ${league.name}.`)
      setLeagueAction(null)
    }
    setWorking(false)
  }

  async function shareLeague(league: PredictionLeague) {
    const url = `${window.location.origin}/predictions?join=${encodeURIComponent(league.league_code)}`
    const share = { title: `${league.name} on Early Shout`, text: `Join my prediction league with code ${league.league_code}.`, url }
    if (navigator.share) await navigator.share(share).catch(() => undefined)
    else {
      await navigator.clipboard.writeText(`${share.text} ${url}`)
      setNotice('Invite link copied.')
    }
  }

  async function showLeagueTable(league: PredictionLeague) {
    setWorking(true)
    const { data, error: tableError } = await supabase.rpc('prediction_get_league_leaderboard', { p_league_id: league.id })
    if (tableError) setError('That friend table could not be loaded.')
    else setLeagueStandings((current) => ({ ...current, [league.id]: data ?? [] }))
    setWorking(false)
  }

  async function changePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod)
    setWorking(true)
    setError('')
    const scopeValue = scope === 'country' ? location.country : scope === 'continent' ? location.continent : ''
    try { await loadStandings(nextPeriod, scope, scopeValue) }
    catch { setError('That table could not be loaded.') }
    setWorking(false)
  }

  async function changeScope(nextScope: Scope) {
    const scopeValue = nextScope === 'country' ? location.country : nextScope === 'continent' ? location.continent : ''
    if (nextScope !== 'global' && (!location.shared || !scopeValue)) {
      setError('Choose your country and continent below, then switch on location tables.')
      return
    }
    setScope(nextScope)
    setWorking(true)
    setError('')
    try { await loadStandings(period, nextScope, scopeValue) }
    catch { setError('That table could not be loaded.') }
    setWorking(false)
  }

  async function saveLocation() {
    if (!user) return setError('Sign in before choosing a country table.')
    if (!location.country || !location.continent) return setError('Choose both your country and continent first.')
    setWorking(true)
    const { error: locationError } = await supabase.rpc('prediction_set_location', {
      p_country_code: location.country,
      p_continent_code: location.continent,
      p_share_location: location.shared,
    })
    if (locationError) setError('Your table setting could not be saved.')
    else setNotice(location.shared ? 'Country and continent tables are now available.' : 'Your location is private and only the global table is active.')
    setWorking(false)
  }

  const countryOptions = useMemo(() => {
    const display = new Intl.DisplayNames(['en'], { type: 'region' })
    const options: Array<{ code: string; name: string }> = []
    for (let first = 65; first <= 90; first += 1) for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second)
      const name = display.of(code)
      if (name && name !== code) options.push({ code, name })
    }
    return options.sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-sky-300/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.22),transparent_36%),linear-gradient(145deg,#071527,#0b1f35_58%,#0b2631)] p-5 shadow-[0_24px_70px_rgba(2,8,23,.28)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-200/10 px-3 py-1 text-xs font-black uppercase tracking-[.18em] text-sky-100"><Sparkles className="size-3.5" /> Predict. Score. Climb.</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Call the result before kickoff.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Pick 1, X or 2 across every live league enabled for Early Shout. Correct calls earn points. Big calls and derbies can earn more.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <HeroStat label="Correct" value="3 pts" />
            <HeroStat label="Derby" value="+1" />
            <HeroStat label="Perfect week" value="+25 credits" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/65 p-1.5" role="tablist" aria-label="Predictions areas">
        {([
          ['picks', Target, 'My picks'],
          ['leagues', Users, 'Friend leagues'],
          ['standings', Trophy, 'Tables'],
        ] as const).map(([value, Icon, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 sm:text-sm ${tab === value ? 'bg-sky-300 text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}><Icon className="size-4" /><span>{label}</span></button>
        ))}
      </div>

      {error ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
      {notice ? <div role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-50"><Check className="mt-0.5 size-4 shrink-0" />{notice}</div> : null}
      {loading ? <LoadingCard /> : null}

      {!loading && tab === 'picks' ? (
        <div className="space-y-5">
          <ScoringGuide />
          {upcoming.length ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Open now</p><h3 className="mt-1 text-2xl font-black text-white">Upcoming matches</h3></div>
                <p className="text-sm text-slate-400">{upcoming.length} matches · picks lock one by one at kickoff</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-3">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Choose a league</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Filter prediction fixtures by league">
                  <button
                    type="button"
                    aria-pressed={activeFixtureLeague === 'all'}
                    onClick={() => { setFixtureLeague('all'); setVisibleFixtureCount(INITIAL_FIXTURE_COUNT) }}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 ${activeFixtureLeague === 'all' ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-slate-700 bg-slate-950/45 text-slate-300 hover:border-slate-500'}`}
                  >
                    All leagues <span className="opacity-70">{upcoming.length}</span>
                  </button>
                  {upcomingLeagueOptions.map((league) => (
                    <button
                      key={league.key}
                      type="button"
                      aria-pressed={activeFixtureLeague === league.key}
                      onClick={() => { setFixtureLeague(league.key); setVisibleFixtureCount(INITIAL_FIXTURE_COUNT) }}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 ${activeFixtureLeague === league.key ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-slate-700 bg-slate-950/45 text-slate-300 hover:border-slate-500'}`}
                    >
                      <span className={`size-2.5 rounded-full ${leagueColour(league.key)}`} />
                      {league.label} <span className="opacity-70">{league.count}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Showing {Math.min(visibleFixtureCount, filteredUpcoming.length)} of {filteredUpcoming.length}. Your saved picks stay safe when you switch leagues.</p>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {visibleUpcoming.map((fixture) => (
                  <FixtureCard key={fixture.fixture_id} fixture={fixture} pick={picks[fixture.fixture_id]} confidence={confidence[fixture.fixture_id] ?? 3} saved={saved[fixture.fixture_id]} onPick={(pick) => setPicks((current) => ({ ...current, [fixture.fixture_id]: pick }))} onConfidence={(value) => setConfidence((current) => ({ ...current, [fixture.fixture_id]: value }))} />
                ))}
              </div>
              {visibleFixtureCount < filteredUpcoming.length ? (
                <button
                  type="button"
                  onClick={() => setVisibleFixtureCount((count) => count + FIXTURE_PAGE_SIZE)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-300/35 bg-sky-300/10 px-4 text-sm font-black text-sky-100 outline-none transition hover:bg-sky-300/15 focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  Show {Math.min(FIXTURE_PAGE_SIZE, filteredUpcoming.length - visibleFixtureCount)} more matches
                </button>
              ) : null}
              <div className="sticky bottom-3 z-10 rounded-2xl border border-sky-200/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-bold text-white">{Object.keys(picks).length} picks chosen</p><p className="text-xs text-slate-400">Save any number now. Come back before kickoff to add or change more.</p></div>
                  <button type="button" onClick={() => void savePicks()} disabled={saving || !unsavedCount} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-300 px-5 py-2.5 text-sm font-black text-slate-950 outline-none transition hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{saving ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{user ? unsavedCount ? `Save ${unsavedCount} changed ${unsavedCount === 1 ? 'pick' : 'picks'}` : 'All changes saved' : 'Sign in to save'}</button>
                </div>
              </div>
            </>
          ) : <EmptyFixtures />}
          {recent.length ? <RecentResults fixtures={recent} saved={saved} /> : null}
        </div>
      ) : null}

      {!loading && tab === 'leagues' ? (
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-fuchsia-300/20 bg-[linear-gradient(140deg,rgba(91,33,182,.32),rgba(15,23,42,.94)_55%,rgba(14,116,144,.24))] p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-300/15 text-fuchsia-200"><Users className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-200">Your own competition</p><h3 className="mt-1 text-2xl font-black text-white">Make a league for your friends.</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose the matches. Share one code. Everyone predicts the same games and gets a private table.</p></div></div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-[1.5rem] border border-slate-700 bg-slate-900/70 p-5">
              <h3 className="text-lg font-black text-white">Create a friend league</h3>
              <label className="mt-4 block text-xs font-bold uppercase tracking-[.14em] text-slate-400" htmlFor="prediction-league-name">League name</label>
              <input id="prediction-league-name" value={leagueName} maxLength={40} onChange={(event) => setLeagueName(event.target.value)} placeholder="Sunday League Legends" className="mt-2 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20" />
              <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">How many matches?</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{(Object.entries(ruleLabels) as [RuleMode, { title: string; copy: string }][]).map(([key, rule]) => <button key={key} type="button" aria-pressed={ruleMode === key} onClick={() => setRuleMode(key)} className={`rounded-xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 ${ruleMode === key ? 'border-sky-300 bg-sky-300/10' : 'border-slate-700 bg-slate-950/55 hover:border-slate-500'}`}><span className="block text-sm font-bold text-white">{rule.title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{rule.copy}</span></button>)}</div></fieldset>
              <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">What wins the table?</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{(Object.entries(rankingLabels) as [RankingMode,{title:string;copy:string}][]).map(([key,choice]) => <button key={key} type="button" aria-pressed={rankingMode === key} onClick={() => setRankingMode(key)} className={`rounded-xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-fuchsia-300 ${rankingMode === key ? 'border-fuchsia-300 bg-fuchsia-300/10' : 'border-slate-700 bg-slate-950/55 hover:border-slate-500'}`}><span className="block text-sm font-bold text-white">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{choice.copy}</span></button>)}</div></fieldset>
              <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Which live leagues?</legend><p className="mt-1 text-xs leading-5 text-slate-500">Only leagues currently licensed and synced from Sportmonks appear here.</p><div className="mt-2 flex flex-wrap gap-2">{competitionOptions.map((league) => { const active = leagueKeys.includes(league.key); return <button key={league.key} type="button" aria-pressed={active} onClick={() => setLeagueKeys((current) => active ? current.filter((key) => key !== league.key) : [...current, league.key])} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${active ? 'border-slate-400 bg-white text-slate-950' : 'border-slate-700 text-slate-400'}`}><span className={`size-2.5 rounded-full ${leagueColour(league.key)}`} />{league.label}</button> })}</div></fieldset>
              <button type="button" onClick={() => void createLeague()} disabled={working} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-400 px-4 text-sm font-black text-slate-950 outline-none hover:bg-fuchsia-300 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"><Plus className="size-4" />Create league</button>
            </section>

            <section className="rounded-[1.5rem] border border-slate-700 bg-slate-900/70 p-5">
              <h3 className="text-lg font-black text-white">Join with a code</h3><p className="mt-2 text-sm leading-6 text-slate-400">Ask your friend for the 8-letter code, then type it here.</p>
              <label htmlFor="prediction-join-code" className="sr-only">League code</label><input id="prediction-join-code" value={joinCode} maxLength={8} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="AB12CD34" className="mt-4 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-center font-mono text-lg font-black uppercase tracking-[.22em] text-white outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20" />
              <button type="button" onClick={() => void joinLeague()} disabled={working} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 text-sm font-black text-sky-100 outline-none hover:bg-sky-300/20 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50">Join league</button>
            </section>
          </div>

          <section>
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">My leagues</p><h3 className="mt-1 text-2xl font-black text-white">Friends tables</h3></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">{leagues.length}</span></div>
            {leagues.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2">{leagues.map((league) => <LeagueCard key={league.id} league={league} standings={leagueStandings[league.id]} working={working} onShare={() => void shareLeague(league)} onTable={() => void showLeagueTable(league)} onChangeMembership={() => setLeagueAction({ league, kind: league.role === 'owner' ? 'delete' : 'leave' })} />)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-slate-600 bg-slate-900/45 p-6 text-center text-sm text-slate-400">No friend leagues yet. Make the first one above.</div>}
          </section>
        </div>
      ) : null}

      {!loading && tab === 'standings' ? (
        <div className="space-y-4">
          <section className="rounded-[1.5rem] border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.16),transparent_38%),rgba(15,23,42,.82)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Prediction leaderboard</p><h3 className="mt-1 text-2xl font-black text-white">Who saw it first?</h3><p className="mt-2 text-sm text-slate-400">Global scores from finished, server-checked matches.</p></div><div className="flex flex-wrap gap-2">{(Object.keys(periodLabels) as Period[]).map((value) => <button key={value} type="button" onClick={() => void changePeriod(value)} aria-pressed={period === value} className={`min-h-9 rounded-full border px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${period === value ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>{periodLabels[value]}</button>)}</div></div>
          </section>
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {([['global','Everyone'],['country','My country'],['continent','My continent']] as [Scope, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => void changeScope(value)} aria-pressed={scope === value} className={`min-h-10 rounded-xl border px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${scope === value ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>{label}</button>)}
              </div>
              <details className="group"><summary className="cursor-pointer list-none text-sm font-bold text-sky-300 outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Set my country <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary><div className="mt-3 grid gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3 sm:grid-cols-2 lg:min-w-[34rem]"><label className="text-xs font-bold text-slate-400">Country<select value={location.country} onChange={(event) => setLocation((current) => ({ ...current, country: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm text-white"><option value="">Choose country</option>{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Continent<select value={location.continent} onChange={(event) => setLocation((current) => ({ ...current, continent: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm text-white"><option value="">Choose continent</option>{continentOptions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="flex items-start gap-2 text-xs leading-5 text-slate-300 sm:col-span-2"><input type="checkbox" checked={location.shared} onChange={(event) => setLocation((current) => ({ ...current, shared: event.target.checked }))} className="mt-1 accent-sky-300" />Let me appear in country and continent tables. This never uses your GPS or IP address.</label><button type="button" onClick={() => void saveLocation()} disabled={working} className="min-h-10 rounded-lg bg-sky-300 px-3 text-xs font-black text-slate-950 disabled:opacity-50 sm:col-span-2">Save table setting</button></div></details>
            </div>
          </section>
          <StandingTable rows={standings} working={working} empty="No scored predictions in this period yet." />
          <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4 text-sm leading-6 text-slate-400"><strong className="text-white">More ways to compare:</strong> use Friend leagues for a private friends table. The main Early Shout leaderboard also lets you compare every quiz and game mode separately.</div>
        </div>
      ) : null}
      {leagueAction ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape' && !working) setLeagueAction(null) }} onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setLeagueAction(null) }}><section role="dialog" aria-modal="true" aria-labelledby="prediction-league-action-title" className="w-full max-w-md rounded-[1.75rem] border border-slate-600 bg-slate-900 p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-sky-300">Confirm change</p><h3 id="prediction-league-action-title" className="mt-1 text-2xl font-black text-white">{leagueAction.kind === 'delete' ? 'Delete this league?' : 'Leave this league?'}</h3></div><button type="button" aria-label="Close confirmation" disabled={working} onClick={() => setLeagueAction(null)} className="grid size-10 place-items-center rounded-xl border border-slate-700 text-slate-300"><X className="size-4" /></button></div><p className="mt-3 text-sm leading-6 text-slate-300">{leagueAction.kind === 'delete' ? <><strong className="text-white">{leagueAction.league.name}</strong> and its private table will disappear for every member. Everyone&apos;s saved predictions remain on their profile.</> : <>You will leave <strong className="text-white">{leagueAction.league.name}</strong>. Your saved predictions remain on your profile.</>}</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><button autoFocus type="button" disabled={working} onClick={() => setLeagueAction(null)} className="min-h-11 rounded-xl border border-slate-600 font-bold text-white">Keep league</button><button type="button" disabled={working} onClick={() => void completeLeagueAction()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-black text-slate-950 disabled:opacity-50 ${leagueAction.kind === 'delete' ? 'bg-rose-300' : 'bg-sky-300'}`}>{working ? <Loader2 className="size-4 animate-spin" /> : null}{leagueAction.kind === 'delete' ? 'Delete for everyone' : 'Leave league'}</button></div></section></div> : null}
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.07] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>
}

function LoadingCard() {
  return <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/50 text-sm text-slate-300"><Loader2 className="size-4 animate-spin text-sky-300" />Loading matches and tables…</div>
}

function ScoringGuide() {
  return <details className="group rounded-2xl border border-sky-300/20 bg-sky-300/[.07] p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-sky-50 outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><span className="inline-flex items-center gap-2"><CircleHelp className="size-4 text-sky-300" />How do points work?</span><span className="text-xs text-sky-200 group-open:hidden">Open</span><span className="hidden text-xs text-sky-200 group-open:inline">Close</span></summary><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Rule icon={<Target />} title="Correct result" copy="A correct 1, X or 2 earns 3 points." /><Rule icon={<Crown />} title="Derby bonus" copy="A correct derby call earns 1 extra point." /><Rule icon={<Sparkles />} title="Brave-call bonus" copy="If very few players got it right, earn 1 or 2 extra points." /><Rule icon={<Coins />} title="Perfect week" copy="Get every pick right, with at least 5 picks in that gameweek, and earn 25 Style Credits." /></div><p className="mt-3 text-xs leading-5 text-sky-100/70">Confidence never multiplies points. It only breaks a tie between players with the same score.</p></details>
}

function Rule({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3"><span className="flex size-7 items-center justify-center rounded-lg bg-sky-300/15 text-sky-200 [&>svg]:size-3.5">{icon}</span><p className="mt-2 text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{copy}</p></div>
}

function FixtureCard({ fixture, pick, confidence, saved, onPick, onConfidence }: { fixture: Fixture; pick?: Pick; confidence: number; saved?: SavedPrediction; onPick: (pick: Pick) => void; onConfidence: (value: number) => void }) {
  return <article className="rounded-[1.35rem] border border-slate-700 bg-slate-900/70 p-4 transition hover:border-sky-300/35 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold"><span className="inline-flex items-center gap-2 uppercase tracking-[.14em] text-slate-400"><span className={`size-2.5 rounded-full ${leagueOptions.find((league) => league.key === fixture.league_key)?.colour ?? 'bg-slate-500'}`} />{fixture.league_name}</span><span className="inline-flex items-center gap-1.5 text-slate-400"><CalendarDays className="size-3.5 text-sky-300" />{formatKickoff(fixture.kickoff_at)}</span></div>{fixture.is_derby ? <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-amber-200"><Sparkles className="size-3" />Derby · +1 if right</div> : null}<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><h4 className="text-right text-base font-black text-white sm:text-lg">{fixture.home_team}</h4><span className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-black uppercase text-slate-500">vs</span><h4 className="text-base font-black text-white sm:text-lg">{fixture.away_team}</h4></div><div className="mt-5 grid grid-cols-3 gap-2">{(['home','draw','away'] as Pick[]).map((value) => <button key={value} type="button" onClick={() => onPick(value)} aria-pressed={pick === value} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-black outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 ${pick === value ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'}`}><span className="block">{pickLabel(value)}</span><span className="mt-0.5 block truncate text-[10px] font-semibold opacity-75">{pickName(value, fixture)}</span></button>)}</div><div className="mt-4 flex items-center gap-3"><label htmlFor={`confidence-${fixture.fixture_id}`} className="shrink-0 text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Confidence {confidence}/5</label><input id={`confidence-${fixture.fixture_id}`} type="range" min={1} max={5} value={confidence} onChange={(event) => onConfidence(Number(event.target.value))} className="w-full accent-sky-300" /></div>{saved ? <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-300"><Check className="size-3.5" />Saved pick: {pickLabel(saved.pick)}</p> : null}</article>
}

function EmptyFixtures() {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-600 bg-slate-900/50 p-7 text-center"><Clock3 className="mx-auto size-7 text-sky-300" /><h3 className="mt-3 text-lg font-black text-white">No open matches just now.</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">The next cards appear after the production fixture sync. This page will never pretend practice matches are real scored fixtures.</p></div>
}

function RecentResults({ fixtures, saved }: { fixtures: Fixture[]; saved: Record<string, SavedPrediction> }) {
  return <section><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Settled</p><h3 className="mt-1 text-2xl font-black text-white">Recent results</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{fixtures.map((fixture) => { const prediction = saved[fixture.fixture_id]; return <div key={fixture.fixture_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/55 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{fixture.home_team} {fixture.home_score}–{fixture.away_score} {fixture.away_team}</p><p className="mt-1 text-xs text-slate-500">{fixture.league_name}</p></div>{prediction ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${(prediction.points_awarded ?? 0) > 0 ? 'bg-emerald-300/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{prediction.points_awarded ?? 0} pts</span> : <span className="text-xs text-slate-500">No pick</span>}</div> })}</div></section>
}

function LeagueCard({ league, standings, working, onShare, onTable, onChangeMembership }: { league: PredictionLeague; standings?: Standing[]; working: boolean; onShare: () => void; onTable: () => void; onChangeMembership: () => void }) {
  return <article className="overflow-hidden rounded-[1.35rem] border border-slate-700 bg-slate-900/65"><div className="border-b border-slate-700 bg-[linear-gradient(120deg,rgba(217,70,239,.12),rgba(56,189,248,.08))] p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[.15em] text-fuchsia-300">{league.role === 'owner' ? 'You run this league' : 'Friend league'}</span><h4 className="mt-1 text-lg font-black text-white">{league.name}</h4></div><span className="rounded-lg border border-white/10 bg-slate-950/55 px-2.5 py-1 font-mono text-xs font-black tracking-[.1em] text-sky-200">{league.league_code}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{ruleLabels[league.rule_mode].title} · {league.league_keys.map((key) => leagueOptions.find((leagueOption) => leagueOption.key === key)?.label).filter(Boolean).join(', ')}</p></div><div className="p-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={onShare} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-fuchsia-400 px-3 text-xs font-black text-slate-950 outline-none hover:bg-fuchsia-300 focus-visible:ring-2 focus-visible:ring-white"><Share2 className="size-3.5" />Share invite</button><button type="button" onClick={onTable} disabled={working} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-600 px-3 text-xs font-black text-white outline-none hover:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-300"><Trophy className="size-3.5" />{standings ? 'Refresh table' : 'Show table'}</button><button type="button" onClick={() => navigator.clipboard.writeText(league.league_code)} aria-label={`Copy ${league.name} code`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 outline-none hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-sky-300"><Copy className="size-3.5" /></button><button type="button" onClick={onChangeMembership} disabled={working} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50 ${league.role === 'owner' ? 'border-rose-300/35 text-rose-200 hover:bg-rose-300/10' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>{league.role === 'owner' ? <Trash2 className="size-3.5" /> : <LogOut className="size-3.5" />}{league.role === 'owner' ? 'Delete league' : 'Leave league'}</button></div>{standings ? <div className="mt-3"><StandingTable rows={standings} compact empty="No scored picks in this league yet." /></div> : null}</div></article>
}

function StandingTable({ rows, working = false, compact = false, empty }: { rows: Standing[]; working?: boolean; compact?: boolean; empty: string }) {
  if (working && !rows.length) return <LoadingCard />
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/45 p-6 text-center text-sm text-slate-400">{empty}</div>
  return <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/55"><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="bg-slate-950/65 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Player</th><th className="px-4 py-3 text-right">Points</th><th className="px-4 py-3 text-right">Right</th><th className="px-4 py-3 text-right">Scored</th></tr></thead><tbody>{rows.map((row, index) => { const rank = Number(row.rank ?? index + 1); return <tr key={row.user_id} className="border-t border-slate-800 text-slate-300"><td className="px-4 py-3"><span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${rank === 1 ? 'bg-amber-300 text-slate-950' : rank <= 3 ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>{rank === 1 ? <Medal className="size-4" /> : rank}</span></td><td className="px-4 py-3 font-bold text-white">{row.username}</td><td className="px-4 py-3 text-right font-black text-sky-300">{row.points}</td><td className="px-4 py-3 text-right">{row.correct_picks}</td><td className="px-4 py-3 text-right">{row.picks_scored}</td></tr> })}</tbody></table></div>{!compact ? <p className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">If points are tied, correct high-confidence calls break the tie.</p> : null}</div>
}
