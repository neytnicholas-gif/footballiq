import type { CSSProperties } from 'react'

const STRIPES = (first: string, second: string) =>
  `repeating-linear-gradient(90deg, ${first} 0 25%, ${second} 25% 50%)`

const HALVES = (first: string, second: string) =>
  `linear-gradient(90deg, ${first} 0 50%, ${second} 50% 100%)`

const CLUB_HOME_COLOURS: Record<string, string> = {
  'afc bournemouth': STRIPES('#d71920', '#111827'),
  'angers sco': STRIPES('#ffffff', '#111827'),
  arsenal: HALVES('#ef0107', '#ffffff'),
  'aston villa': HALVES('#670e36', '#95bfe5'),
  'athletic club': STRIPES('#ee2523', '#ffffff'),
  'atletico de madrid': STRIPES('#cb3524', '#ffffff'),
  auxerre: HALVES('#ffffff', '#1e5aa8'),
  brentford: STRIPES('#e30613', '#ffffff'),
  brest: STRIPES('#e30613', '#ffffff'),
  'brighton & hove albion': STRIPES('#0057b8', '#ffffff'),
  'celta de vigo': '#8ac3ee',
  chelsea: '#034694',
  'coventry city': '#77b9e8',
  'crystal palace': STRIPES('#1b458f', '#c4122e'),
  'deportivo alaves': STRIPES('#005baa', '#ffffff'),
  'deportivo la coruna': STRIPES('#0054a6', '#ffffff'),
  elche: STRIPES('#ffffff', '#138a36'),
  espanyol: STRIPES('#1478be', '#ffffff'),
  everton: '#003399',
  'fc barcelona': STRIPES('#004d98', '#a50044'),
  fulham: HALVES('#ffffff', '#111827'),
  getafe: '#005999',
  'hull city': STRIPES('#f5a12d', '#111827'),
  'ipswich town': '#0044a9',
  'le havre': HALVES('#8dc8e8', '#16385f'),
  'le mans': HALVES('#d71920', '#f4c542'),
  'leeds united': HALVES('#ffffff', '#1d428a'),
  lens: STRIPES('#e30613', '#f8d447'),
  levante: STRIPES('#b0003a', '#00529f'),
  liverpool: '#c8102e',
  lorient: STRIPES('#f58220', '#111827'),
  'losc lille': HALVES('#e01e2f', '#1b2a4e'),
  malaga: STRIPES('#72c5e8', '#ffffff'),
  'manchester city': '#6cabdd',
  'manchester united': '#da291c',
  monaco: 'linear-gradient(135deg, #e30613 0 50%, #ffffff 50% 100%)',
  'newcastle united': STRIPES('#111827', '#ffffff'),
  nice: STRIPES('#d71920', '#111827'),
  'nottingham forest': '#dd0000',
  'olympique lyonnais': STRIPES('#ffffff', '#1b3f8b'),
  'olympique marseille': HALVES('#ffffff', '#2faee0'),
  osasuna: HALVES('#c8102e', '#0b1f3a'),
  paris: '#244aa5',
  'paris saint germain': STRIPES('#071c3b', '#e30613'),
  'racing santander': STRIPES('#ffffff', '#159447'),
  'rayo vallecano': 'linear-gradient(135deg, #ffffff 0 38%, #d71920 38% 58%, #ffffff 58% 100%)',
  'real betis': STRIPES('#159447', '#ffffff'),
  'real madrid': HALVES('#ffffff', '#7b2cbf'),
  'real sociedad': STRIPES('#0067b1', '#ffffff'),
  rennes: HALVES('#e30613', '#111827'),
  sevilla: HALVES('#ffffff', '#d71920'),
  strasbourg: '#1597d4',
  sunderland: STRIPES('#eb172b', '#ffffff'),
  'tottenham hotspur': HALVES('#ffffff', '#132257'),
  toulouse: '#5b2c83',
  troyes: '#1d70b7',
  valencia: HALVES('#ffffff', '#111827'),
  villarreal: '#ffe667',
}

function normaliseClubName(clubName: string) {
  return clubName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function fallbackClubColour(clubName: string) {
  let hash = 0
  for (const character of clubName) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 62% 43%)`
}

export function getClubHomeColour(clubName: string) {
  return CLUB_HOME_COLOURS[normaliseClubName(clubName)] ?? fallbackClubColour(clubName)
}

export function ClubColourDot({ clubName, className = '' }: { clubName: string; className?: string }) {
  const style: CSSProperties = { background: getClubHomeColour(clubName) }

  return (
    <span
      role="img"
      aria-label={`${clubName} home colours`}
      title={`${clubName} home colours`}
      className={`inline-block size-3.5 shrink-0 rounded-full border border-black/15 shadow-[0_0_0_2px_rgba(255,255,255,.9)] ${className}`}
      style={style}
    />
  )
}
