'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock, Check, ChevronRight, CircleAlert, Goal, LockKeyhole,
  ShieldCheck, Sparkles, Target, Users, Zap,
} from 'lucide-react'
import { useMarketFormation } from '@/components/market/use-market-formation'
import {
  loadMyGameweekChip, loadMyMarketProgression, playMarketGameweekChip,
  setMarketFormation,
} from '@/lib/market/client'
import {
  formatMarketChipMultiplier, MARKET_GAMEWEEK_CHIPS, MARKET_OUTFIELD_POSITIONS,
  marketChipDefinition, marketChipMovementExample, marketChipMultiplierBasisPoints,
  type MarketChipDefinition,
} from '@/lib/market/chips'
import {
  countFormation, isValidFormation, MARKET_FORMATION_OPTIONS, MARKET_FORMATIONS,
  type MarketFormationKey,
} from '@/lib/market/formation'
import { formatFiqCompact, formatMarketDateTime, MARKET_MAX_PORTFOLIO_SIZE } from '@/lib/market/format'
import type {
  MarketGameweekChipKey, MarketGameweekChipStatus, MarketHolding, MarketPlayer,
  MarketPosition,
} from '@/lib/market/types'

const CHIP_TONES: Record<MarketChipDefinition['tone'], { card: string; badge: string; button: string }> = {
  mint: { card: 'border-emerald-300/25 bg-emerald-300/[.08]', badge: 'bg-emerald-300/15 text-emerald-200', button: 'bg-emerald-300 text-emerald-950' },
  sky: { card: 'border-sky-300/25 bg-sky-300/[.08]', badge: 'bg-sky-300/15 text-sky-200', button: 'bg-sky-300 text-sky-950' },
  violet: { card: 'border-violet-300/25 bg-violet-300/[.08]', badge: 'bg-violet-300/15 text-violet-200', button: 'bg-violet-300 text-violet-950' },
  amber: { card: 'border-amber-300/25 bg-amber-300/[.08]', badge: 'bg-amber-300/15 text-amber-200', button: 'bg-amber-300 text-amber-950' },
  rose: { card: 'border-rose-300/25 bg-rose-300/[.08]', badge: 'bg-rose-300/15 text-rose-200', button: 'bg-rose-300 text-rose-950' },
}

export function MarketGameweekStrategy({
  players,
  holdings,
  userSignedIn,
}: {
  players: MarketPlayer[]
  holdings: MarketHolding[]
  userSignedIn: boolean
}) {
  const activeFormation = useMarketFormation()
  const [formationBusy, setFormationBusy] = useState<MarketFormationKey | null>(null)
  const [formation343Owned, setFormation343Owned] = useState(false)
  const [chipStatus, setChipStatus] = useState<MarketGameweekChipStatus | null>(null)
  const [chipLoading, setChipLoading] = useState(userSignedIn)
  const [selectedChip, setSelectedChip] = useState<MarketGameweekChipKey | null>(null)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([])
  const [selectedPosition, setSelectedPosition] = useState<Exclude<MarketPosition, 'GK'> | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [chipBusy, setChipBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const holdingRows = useMemo(() => holdings
    .map((holding) => ({ holding, player: playersById.get(holding.player_id) }))
    .filter((row): row is { holding: MarketHolding; player: MarketPlayer } => Boolean(row.player)), [holdings, playersById])
  const formationCounts = useMemo(() => countFormation(holdings, playersById), [holdings, playersById])

  const reload = useCallback(async () => {
    if (userSignedIn) setChipLoading(true)
    const [chipResult, progressionResult] = await Promise.all([
      userSignedIn ? loadMyGameweekChip() : Promise.resolve({ data: null, error: null }),
      loadMyMarketProgression(false),
    ])
    setChipStatus(chipResult.data)
    setFormation343Owned(Boolean(progressionResult.data.store.find((item) => item.item_key === 'formation_343')?.owned))
    if (chipResult.error) setNotice({ kind: 'error', message: chipResult.error.message })
    setChipLoading(false)
  }, [userSignedIn])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const selectedDefinition = selectedChip ? marketChipDefinition(selectedChip) : null
  const selectedTargetNames = selectedPlayerIds.map((id) => playersById.get(id)?.display_name).filter(Boolean) as string[]
  const selectedTargetCount = selectedDefinition?.targetCount === 'full-xi'
    ? holdings.length
    : selectedDefinition?.targetCount === 'position'
      ? holdingRows.filter((row) => row.player.position === selectedPosition).length
      : selectedPlayerIds.length
  const selectedMultiplier = selectedDefinition
    ? marketChipMultiplierBasisPoints(selectedDefinition.key, selectedTargetCount || undefined)
    : 10_000
  const selectionReady = Boolean(selectedDefinition) && (
    selectedDefinition?.targetCount === 'full-xi'
      ? holdings.length === MARKET_MAX_PORTFOLIO_SIZE && isValidFormation(formationCounts, activeFormation)
      : selectedDefinition?.targetCount === 'position'
        ? Boolean(selectedPosition && holdingRows.some((row) => row.player.position === selectedPosition))
        : selectedPlayerIds.length === selectedDefinition?.targetCount
  )

  async function chooseFormation(formation: MarketFormationKey) {
    if (formation === activeFormation || formationBusy) return
    setFormationBusy(formation)
    setNotice(null)
    const result = await setMarketFormation(formation)
    if (result.error) setNotice({ kind: 'error', message: result.error.message })
    else setNotice({ kind: 'success', message: `${formation} is now your active formation.` })
    setFormationBusy(null)
  }

  function chooseChip(key: MarketGameweekChipKey) {
    if (chipStatus?.chip_used || !chipStatus?.can_play) return
    setSelectedChip(key)
    setSelectedPlayerIds([])
    setSelectedPosition(null)
    setReviewing(false)
    setNotice(null)
  }

  function togglePlayer(playerId: number, maximum: number) {
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= maximum) return [...current.slice(1), playerId]
      return [...current, playerId]
    })
    setReviewing(false)
  }

  async function confirmChip() {
    if (!selectedDefinition || !selectionReady || chipBusy) return
    setChipBusy(true)
    setNotice(null)
    const result = await playMarketGameweekChip({
      chipKey: selectedDefinition.key,
      playerIds: selectedPlayerIds,
      position: selectedPosition,
    })
    if (result.error) {
      setNotice({ kind: 'error', message: result.error.message })
    } else {
      setChipStatus(result.data)
      setSelectedChip(null)
      setSelectedPlayerIds([])
      setSelectedPosition(null)
      setReviewing(false)
      setNotice({ kind: 'success', message: `${selectedDefinition.name} is locked in for this gameweek.` })
    }
    setChipBusy(false)
  }

  const activeChip = chipStatus?.active_chip ? marketChipDefinition(chipStatus.active_chip.chip_key) : null
  const activeMultiplier = chipStatus?.active_chip?.multiplier_basis_points
    ?? (activeChip ? marketChipMultiplierBasisPoints(activeChip.key, chipStatus?.active_chip?.targets.length) : 10_000)
  const lostActiveTargets = chipStatus?.active_chip?.targets.filter((target) => !target.still_held) ?? []

  return (
    <section id="gameweek-strategy" aria-labelledby="gameweek-strategy-title" className="overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.12),transparent_30%),linear-gradient(145deg,#071f2b,#092d32_55%,#082720)] text-slate-100 shadow-[0_28px_80px_-48px_rgba(0,0,0,.9)]">
      <div className="border-b border-white/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Goal className="size-4" />Gameweek strategy</p>
            <h2 id="gameweek-strategy-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">Choose your shape. Add a weekly twist.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Your formation decides the 11 places you can fill. You can also play one optional chip to change how this week’s verified match movement affects your held copies.</p>
          </div>
          <Link href="/game-rules#gameweek-chips" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Read chip rules <ChevronRight className="size-4" /></Link>
        </div>

        {notice ? <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${notice.kind === 'error' ? 'border-rose-300/25 bg-rose-300/10 text-rose-100' : 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'}`}>{notice.message}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {MARKET_FORMATION_OPTIONS.map((option) => {
            const limits = MARKET_FORMATIONS[option.key]
            const locked = option.requiresReward && !formation343Owned
            const active = option.key === activeFormation
            return (
              <button
                key={option.key}
                type="button"
                disabled={Boolean(locked || formationBusy || active)}
                onClick={() => void chooseFormation(option.key)}
                aria-pressed={active}
                className={`min-h-32 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed ${active ? 'border-emerald-300/60 bg-emerald-300/15 shadow-[0_14px_35px_-24px_rgba(52,211,153,.8)]' : locked ? 'border-white/10 bg-black/15 opacity-65' : 'border-white/15 bg-white/[.055] hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-white/[.08]'}`}
              >
                <span className="flex items-center justify-between gap-3"><strong className="text-xl text-white">{option.label}</strong>{active ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300 px-2 py-1 text-[10px] font-black text-emerald-950"><Check className="size-3" />Active</span> : locked ? <LockKeyhole className="size-4 text-slate-400" /> : null}</span>
                <span className="mt-2 block text-xs leading-5 text-slate-300">{option.description}</span>
                <span className="mt-3 block text-[10px] font-black uppercase tracking-[.12em] text-cyan-200">GK {limits.GK} · DEF {limits.DEF} · MID {limits.MID} · FWD {limits.FWD}</span>
                {locked ? <span className="mt-2 block text-[10px] text-amber-200">Unlock permanently in Rewards.</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Your weekly chip</p>
            <h3 className="mt-1 text-xl font-black text-white">One choice. Real upside and risk.</h3>
          </div>
          {chipStatus ? <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold text-slate-300"><CalendarClock className="size-4 text-cyan-300" />Choose before {formatMarketDateTime(chipStatus.deadline_at)}</p> : null}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.08] p-4 text-xs leading-5 text-amber-50">
          <p className="font-black text-amber-200">Important: chips work both ways.</p>
          <p className="mt-1">A boosted player can rise faster or fall faster. The result stays on your held copy. Selling pays your held value, but never changes the normal public price that everyone else sees and pays.</p>
        </div>

        {!userSignedIn ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-5 text-center"><ShieldCheck className="mx-auto size-7 text-emerald-300" /><p className="mt-2 font-black text-white">Sign in to use a weekly chip</p><p className="mt-1 text-sm text-slate-400">Formation choice works on this device. Chips need an account so their results stay attached to your roster.</p><Link href="/login?next=/market/roster#gameweek-strategy" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-5 py-2 text-sm font-black text-emerald-950">Sign in</Link></div>
        ) : chipLoading ? (
          <div role="status" className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-5"><p className="font-black text-white">Checking this gameweek…</p><p className="mt-1 text-sm text-slate-400">We are loading your chip choice and deadline.</p></div>
        ) : !chipStatus ? (
          <div role="alert" className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-5"><p className="font-black text-rose-100">Weekly chips are temporarily unavailable</p><p className="mt-1 text-sm text-rose-100/75">Nothing has been used. Refresh the page before choosing a chip.</p></div>
        ) : activeChip && chipStatus?.active_chip ? (
          <div className={`mt-4 rounded-2xl border p-5 ${CHIP_TONES[activeChip.tone].card}`}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-300">{chipStatus.active_chip.state === 'void' ? 'Chip ended' : 'Chip locked in'}</p><h4 className="mt-1 text-2xl font-black text-white">{activeChip.name}</h4><p className="mt-1 text-sm text-slate-300">{activeChip.summary}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${CHIP_TONES[activeChip.tone].badge}`}>{chipStatus.active_chip.targets.length} {chipStatus.active_chip.targets.length === 1 ? 'player' : 'players'} · {formatMarketChipMultiplier(activeMultiplier)}</span></div>
            <p className="mt-4 text-sm font-bold text-white">Target: {chipStatus.active_chip.target_position ? MARKET_OUTFIELD_POSITIONS.find((position) => position.key === chipStatus.active_chip?.target_position)?.label : chipStatus.active_chip.targets.map((target) => `${target.player_name}${target.still_held ? '' : ' (sold)'}`).join(', ')}</p>
            <p className="mt-2 text-xs text-slate-400">{chipStatus.active_chip.state === 'void' ? 'All remaining targets were sold before an eligible result, so this chip ended without applying.' : chipStatus.active_chip.state === 'applied' ? `Applied so far: ${chipStatus.active_chip.total_adjustment_minor >= 0 ? '+' : '-'}${formatFiqCompact(Math.abs(chipStatus.active_chip.total_adjustment_minor))}.` : 'Armed. It will apply when eligible match ratings are processed.'} Chip choices cannot be changed after confirmation.</p>
            {lostActiveTargets.length > 0 && chipStatus.active_chip.state !== 'void' ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">{lostActiveTargets.map((target) => target.player_name).join(', ')} {lostActiveTargets.length === 1 ? 'was' : 'were'} sold. A sold copy cannot receive a future chip result; any target still held remains active.</p> : null}
          </div>
        ) : chipStatus && !chipStatus.can_play ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-5"><p className="flex items-center gap-2 font-black text-white"><LockKeyhole className="size-4 text-amber-300" />Chip selection is closed</p><p className="mt-1 text-sm text-slate-400">The first tracked match has kicked off. Your next chip becomes available when the next gameweek opens.</p></div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {MARKET_GAMEWEEK_CHIPS.map((chip) => <ChipChoiceCard key={chip.key} chip={chip} selected={selectedChip === chip.key} onChoose={() => chooseChip(chip.key)} />)}
          </div>
        )}

        {selectedDefinition && !chipStatus?.chip_used && chipStatus?.can_play ? (
          <div className={`mt-4 rounded-2xl border p-5 ${CHIP_TONES[selectedDefinition.tone].card}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-300">Set your target</p><h4 className="mt-1 text-xl font-black text-white">{selectedDefinition.name}</h4><p className="mt-1 text-sm text-slate-300">{selectedDefinition.targetHelp}</p></div><button type="button" onClick={() => { setSelectedChip(null); setReviewing(false) }} className="min-h-10 rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white">Choose another</button></div>

            {typeof selectedDefinition.targetCount === 'number' ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {holdingRows.map(({ holding, player }) => {
                  const selected = selectedPlayerIds.includes(player.id)
                  return <button key={player.id} type="button" aria-pressed={selected} onClick={() => togglePlayer(player.id, selectedDefinition.targetCount as number)} className={`min-h-14 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected ? 'border-white/60 bg-white/15' : 'border-white/10 bg-black/15 hover:bg-white/[.07]'}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-black text-white">{player.display_name}</span><span className="text-[10px] font-black text-slate-400">{player.position}</span></span><span className="mt-1 block text-xs text-slate-400">Held value {formatFiqCompact(holding.current_value_snapshot)}</span></button>
                })}
              </div>
            ) : selectedDefinition.targetCount === 'position' ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">{MARKET_OUTFIELD_POSITIONS.map((position) => { const count = holdingRows.filter((row) => row.player.position === position.key).length; return <button key={position.key} type="button" disabled={count === 0} aria-pressed={selectedPosition === position.key} onClick={() => { setSelectedPosition(position.key); setReviewing(false) }} className={`min-h-16 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45 ${selectedPosition === position.key ? 'border-white/60 bg-white/15' : 'border-white/10 bg-black/15 hover:bg-white/[.07]'}`}><span className="font-black text-white">{position.label}</span><span className="mt-1 block text-xs text-slate-400">{count} held now</span></button> })}</div>
            ) : (
              <div className={`mt-4 rounded-xl border p-4 ${selectionReady ? 'border-emerald-300/25 bg-emerald-300/10' : 'border-amber-300/25 bg-amber-300/10'}`}><p className="flex items-center gap-2 font-black text-white">{selectionReady ? <Check className="size-4 text-emerald-300" /> : <CircleAlert className="size-4 text-amber-300" />}{selectionReady ? `Your ${activeFormation} XI is ready` : `Complete a valid ${activeFormation} XI first`}</p><p className="mt-1 text-xs text-slate-300">{holdings.length}/11 players selected.</p></div>
            )}

            {!holdingRows.length && selectedDefinition.targetCount !== 'full-xi' ? <p className="mt-4 text-sm text-amber-200">Add players to your roster before choosing this chip.</p> : null}

            {reviewing && selectionReady ? (
              <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-4"><p className="font-black text-white">Confirm {selectedDefinition.name}?</p><p className="mt-1 text-xs leading-5 text-slate-300">Target: {selectedPosition ? MARKET_OUTFIELD_POSITIONS.find((position) => position.key === selectedPosition)?.label : selectedDefinition.targetCount === 'full-xi' ? `your full ${activeFormation} XI` : selectedTargetNames.join(', ')}. This is your only chip this gameweek and it cannot be changed.</p><p className="mt-3 rounded-lg border border-white/10 bg-white/[.06] px-3 py-2 text-xs font-bold leading-5 text-white">{marketChipMovementExample(selectedMultiplier)}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">Selling a target before their result is processed removes that exact held copy from the chip.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={chipBusy} onClick={() => void confirmChip()} className={`min-h-11 rounded-xl px-5 py-2 text-sm font-black disabled:opacity-50 ${CHIP_TONES[selectedDefinition.tone].button}`}>{chipBusy ? 'Locking in…' : 'Confirm chip'}</button><button type="button" disabled={chipBusy} onClick={() => setReviewing(false)} className="min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-black text-white">Go back</button></div></div>
            ) : (
              <button type="button" disabled={!selectionReady} onClick={() => setReviewing(true)} className={`mt-4 min-h-11 rounded-xl px-5 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${CHIP_TONES[selectedDefinition.tone].button}`}>Review chip</button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ChipChoiceCard({ chip, selected, onChoose }: { chip: MarketChipDefinition; selected: boolean; onChoose: () => void }) {
  const tone = CHIP_TONES[chip.tone]
  const Icon = chip.key === 'triple_shout' ? Zap : chip.key === 'power_pair' ? Users : chip.key === 'position_pulse' ? Target : chip.key === 'full_xi_surge' ? Sparkles : ShieldCheck
  return <button type="button" aria-pressed={selected} onClick={onChoose} className={`min-h-48 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${tone.card} ${selected ? 'ring-2 ring-white/60' : 'hover:-translate-y-0.5 hover:bg-white/[.1]'}`}><span className={`grid size-10 place-items-center rounded-xl ${tone.badge}`}><Icon className="size-5" /></span><strong className="mt-4 block text-base text-white">{chip.name}</strong><span className="mt-1 block text-xs leading-5 text-slate-300">{chip.summary}</span><span className={`mt-3 block text-[10px] font-black uppercase tracking-[.1em] ${tone.badge} w-fit rounded-full px-2 py-1`}>{chip.multiplierLabel}</span></button>
}
