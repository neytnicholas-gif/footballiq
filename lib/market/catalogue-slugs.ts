export type CatalogueSlugCandidate = {
  providerPlayerId: string
  candidateSlug: string
}

export type ExistingCatalogueSlug = {
  providerPlayerId: string
  seasonId: string
  slug: string
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
}

/**
 * Keeps published player URLs stable across provider refreshes while assigning
 * a deterministic, collision-free slug to genuinely new or transferred rows.
 */
export function resolveCataloguePlayerSlugs(
  seasonId: string,
  candidates: CatalogueSlugCandidate[],
  existingRows: ExistingCatalogueSlug[],
) {
  const targetSeasonRows = existingRows.filter((row) => row.seasonId === seasonId)
  const slugOwner = new Map(targetSeasonRows.map((row) => [row.slug, row.providerPlayerId]))
  const existingSlugByProvider = new Map<string, string>()

  for (const row of [...existingRows].sort((left, right) => {
    const leftPriority = left.seasonId === seasonId ? 0 : 1
    const rightPriority = right.seasonId === seasonId ? 0 : 1
    return leftPriority - rightPriority || left.seasonId.localeCompare(right.seasonId)
  })) {
    if (!existingSlugByProvider.has(row.providerPlayerId)) {
      existingSlugByProvider.set(row.providerPlayerId, row.slug)
    }
  }

  const resolved = new Map<string, string>()
  const ordered = [...candidates].sort((left, right) =>
    left.providerPlayerId.localeCompare(right.providerPlayerId, 'en', { numeric: true }))

  for (const candidate of ordered) {
    const providerPlayerId = candidate.providerPlayerId
    const preferred = unique([
      existingSlugByProvider.get(providerPlayerId),
      candidate.candidateSlug,
      `${candidate.candidateSlug}-${providerPlayerId}`,
    ])
    let selected = preferred.find((slug) => {
      const owner = slugOwner.get(slug)
      return !owner || owner === providerPlayerId
    })

    if (!selected) {
      let suffix = 2
      do {
        selected = `${candidate.candidateSlug}-${providerPlayerId}-${suffix}`
        suffix += 1
      } while (slugOwner.has(selected) && slugOwner.get(selected) !== providerPlayerId)
    }

    slugOwner.set(selected, providerPlayerId)
    resolved.set(providerPlayerId, selected)
  }

  return resolved
}
