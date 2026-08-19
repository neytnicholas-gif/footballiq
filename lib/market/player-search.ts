type SearchablePlayer = {
  display_name: string
  short_name?: string | null
  club_name: string
}

export function normalizePlayerSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function matchesPlayerSearch(player: SearchablePlayer, query: string) {
  const normalizedQuery = normalizePlayerSearch(query)
  if (!normalizedQuery) return true

  return [player.display_name, player.short_name, player.club_name]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizePlayerSearch(value).includes(normalizedQuery))
}
