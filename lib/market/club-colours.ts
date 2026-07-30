type ColourPreset = {
  primary: string
  secondary: string
  accent: string
  foreground: string
  confidence: 'generated' | 'review-required'
}

const COLOUR_POOL: ColourPreset[] = [
  { primary: '#1247A6', secondary: '#E7EEF8', accent: '#5FA8FF', foreground: '#0A1224', confidence: 'review-required' },
  { primary: '#0F6D4D', secondary: '#E8F6EE', accent: '#3EB489', foreground: '#0A1F17', confidence: 'review-required' },
  { primary: '#8A1C2C', secondary: '#F8E8EB', accent: '#E86A7A', foreground: '#2A0B11', confidence: 'review-required' },
  { primary: '#3F2E7A', secondary: '#EEE9F8', accent: '#9B83F8', foreground: '#120E23', confidence: 'review-required' },
  { primary: '#9A5C13', secondary: '#FBF1E4', accent: '#E7A03A', foreground: '#2E1A05', confidence: 'review-required' },
  { primary: '#005A7A', secondary: '#E5F3F8', accent: '#3AA0C6', foreground: '#08202A', confidence: 'review-required' },
  { primary: '#7A0F3D', secondary: '#F7E4EE', accent: '#D25592', foreground: '#220B17', confidence: 'review-required' },
  { primary: '#3A4C16', secondary: '#EEF4DF', accent: '#9BCB4F', foreground: '#151C08', confidence: 'review-required' },
]

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getFootballIQClubColours(clubName: string): ColourPreset {
  const normalized = clubName.trim().toLowerCase()
  if (!normalized) {
    return {
      primary: '#2F3B52',
      secondary: '#EAEFF7',
      accent: '#90A3C8',
      foreground: '#0F1420',
      confidence: 'review-required',
    }
  }

  return COLOUR_POOL[stableHash(normalized) % COLOUR_POOL.length]
}
