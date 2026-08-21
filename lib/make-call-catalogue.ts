import { createHash } from 'node:crypto'

export const MAKE_CALL_TOTAL_ROUNDS = 500
export const MAKE_CALL_GENERATED_ROUNDS = MAKE_CALL_TOTAL_ROUNDS - 1

export type MakeCallCatalogueSourcePlayer = {
  sourceId: string
  stablePlayerId: string
  displayName: string
  clubName: string
  competitionKey: string
  competitionName: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  currentValue: number
}

export type MakeCallCatalogueRound = {
  id: string
  slug: string
  prompt: string
  sortOrder: number
  players: Array<{
    id: string
    stablePlayerId: string
    displayName: string
    shortName: string
    clubName: string
    positionLabel: string
    initials: string
    accentFrom: string
    accentTo: string
    displayOrder: 1 | 2 | 3
  }>
}

type Candidate = {
  key: string
  groupKey: string
  kind: 'league' | 'cross-league'
  players: [MakeCallCatalogueSourcePlayer, MakeCallCatalogueSourcePlayer, MakeCallCatalogueSourcePlayer]
}

const positionLabels = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
} as const

const positionPrompts = {
  GK: ['WHO GETS THE GLOVES?', 'BUILD FROM THE BACK.', 'LAST-MINUTE SAVE.', 'YOUR NUMBER ONE?'],
  DEF: ['BUILD YOUR BACK LINE.', 'WHO LEADS THE DEFENCE?', 'LAST LINE LEADERS.', 'LOCK DOWN THE BACK.'],
  MID: ['WHO RUNS THE MIDFIELD?', 'CONTROL OR CHAOS?', 'OWN THE ENGINE ROOM.', 'MAKE THE MIDFIELD TICK.'],
  FWD: ['WHO LEADS THE LINE?', 'ONE CHANCE, ONE CALL.', 'PICK YOUR MATCH WINNER.', 'FINAL-THIRD FIREPOWER.'],
} as const

const competitionColours: Record<string, [string, string]> = {
  'premier-league': ['#3D195B', '#00FF85'],
  'la-liga': ['#EA154B', '#071B42'],
  'ligue-1': ['#091C3E', '#D7FF3F'],
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function deterministicUuid(namespace: string, value: string) {
  const hash = digest(`${namespace}:${value}`)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function shortName(displayName: string) {
  return displayName.trim().split(/\s+/).at(-1)?.slice(0, 40) || displayName.slice(0, 40)
}

function stableSlug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'early-shout-player'
}

function initials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  const value = parts.length > 1 ? `${parts[0]![0] ?? ''}${parts.at(-1)?.[0] ?? ''}` : displayName.slice(0, 2)
  return value.toLocaleUpperCase('en-GB').replace(/[^A-ZÀ-ÖØ-Þ]/g, '').slice(0, 3) || 'ES'
}

function combinations(players: MakeCallCatalogueSourcePlayer[], groupKey: string, kind: Candidate['kind']) {
  const output: Candidate[] = []
  for (let first = 0; first < players.length - 2; first += 1) {
    for (let second = first + 1; second < players.length - 1; second += 1) {
      for (let third = second + 1; third < players.length; third += 1) {
        const trio = [players[first]!, players[second]!, players[third]!] as Candidate['players']
        if (kind === 'cross-league' && new Set(trio.map((player) => player.competitionKey)).size < 2) continue
        const key = trio.map((player) => player.sourceId).sort().join('|')
        output.push({ key, groupKey, kind, players: trio })
      }
    }
  }
  return output
}

function candidateGroups(players: MakeCallCatalogueSourcePlayer[]) {
  const groups = new Map<string, MakeCallCatalogueSourcePlayer[]>()

  const addBucketed = (kind: Candidate['kind'], rows: MakeCallCatalogueSourcePlayer[], bucketSize: number, prefix: string) => {
    const sorted = [...rows].sort((a, b) => b.currentValue - a.currentValue || a.displayName.localeCompare(b.displayName))
    for (let index = 0; index < sorted.length; index += bucketSize) {
      const bucket = sorted.slice(index, index + bucketSize)
      if (bucket.length < 3) continue
      groups.set(`${kind}:${prefix}:${Math.floor(index / bucketSize)}`, bucket)
    }
  }

  const leaguePosition = new Map<string, MakeCallCatalogueSourcePlayer[]>()
  const globalPosition = new Map<string, MakeCallCatalogueSourcePlayer[]>()
  for (const player of players) {
    const leagueKey = `${player.competitionKey}:${player.position}`
    leaguePosition.set(leagueKey, [...(leaguePosition.get(leagueKey) ?? []), player])
    globalPosition.set(player.position, [...(globalPosition.get(player.position) ?? []), player])
  }
  for (const [key, rows] of leaguePosition) addBucketed('league', rows, 9, key)
  for (const [key, rows] of globalPosition) addBucketed('cross-league', rows, 12, key)

  return [...groups.entries()].flatMap(([groupKey, rows]) => combinations(
    rows,
    groupKey,
    groupKey.startsWith('cross-league:') ? 'cross-league' : 'league',
  ))
}

function selectRoundRobin(candidates: Candidate[], target: number) {
  const byGroup = new Map<string, Candidate[]>()
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate.key)) continue
    seen.add(candidate.key)
    byGroup.set(candidate.groupKey, [...(byGroup.get(candidate.groupKey) ?? []), candidate])
  }
  for (const rows of byGroup.values()) {
    rows.sort((a, b) => digest(a.key).localeCompare(digest(b.key)))
  }

  const groupKeys = [...byGroup.keys()].sort((a, b) => digest(a).localeCompare(digest(b)))
  const selected: Candidate[] = []
  let pass = 0
  while (selected.length < target) {
    let added = false
    for (const groupKey of groupKeys) {
      const candidate = byGroup.get(groupKey)?.[pass]
      if (!candidate) continue
      selected.push(candidate)
      added = true
      if (selected.length === target) break
    }
    if (!added) break
    pass += 1
  }
  return selected
}

function roundPrompt(candidate: Candidate) {
  const position = candidate.players[0].position
  const templates = positionPrompts[position]
  const template = templates[Number.parseInt(digest(candidate.key).slice(0, 2), 16) % templates.length]
  const context = candidate.kind === 'cross-league'
    ? 'CROSS-LEAGUE SHOWDOWN'
    : `${candidate.players[0].competitionName.toLocaleUpperCase('en-GB')} ${positionLabels[position].toLocaleUpperCase('en-GB')}S`
  return `${context} · ${template} START ONE. BENCH ONE. SELL ONE.`
}

export function buildMakeCallCatalogue(
  sourcePlayers: MakeCallCatalogueSourcePlayer[],
  target = MAKE_CALL_GENERATED_ROUNDS,
) {
  const validPlayers = sourcePlayers.filter((player) => (
    player.sourceId.length > 0
    && player.stablePlayerId.length > 0
    && player.displayName.trim().length >= 2
    && player.clubName.trim().length >= 2
    && ['GK', 'DEF', 'MID', 'FWD'].includes(player.position)
    && Number.isFinite(player.currentValue)
  ))
  const selected = selectRoundRobin(candidateGroups(validPlayers), target)
  if (selected.length < target) {
    throw new Error(`Make the Call needs ${target} generated rounds, but the verified catalogue could only create ${selected.length}.`)
  }

  return selected.map((candidate, roundIndex): MakeCallCatalogueRound => {
    const roundId = deterministicUuid('make-call-round', candidate.key)
    const roundHash = digest(candidate.key)
    const orderedPlayers = [...candidate.players].sort((a, b) => a.sourceId.localeCompare(b.sourceId))
    return {
      id: roundId,
      slug: `call-${roundHash.slice(0, 20)}`,
      prompt: roundPrompt(candidate),
      sortOrder: 1_000 + roundIndex,
      players: orderedPlayers.map((player, playerIndex) => {
        const colours = competitionColours[player.competitionKey] ?? ['#0F766E', '#38BDF8']
        return {
          id: deterministicUuid('make-call-player', `${roundId}:${player.sourceId}`),
          stablePlayerId: stableSlug(player.stablePlayerId),
          displayName: player.displayName.slice(0, 80),
          shortName: shortName(player.displayName),
          clubName: player.clubName.slice(0, 80),
          positionLabel: positionLabels[player.position],
          initials: initials(player.displayName),
          accentFrom: colours[0],
          accentTo: colours[1],
          displayOrder: (playerIndex + 1) as 1 | 2 | 3,
        }
      }),
    }
  })
}
