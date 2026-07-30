import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

type DuplicateMembership = {
  providerPlayerId: string
  classification: string
  clubs: string[]
  activeClubProviderId?: string
  requiresReview: boolean
  reason: string
  evidence: Array<{
    clubProviderId: string
    fullName: string
    displayName: string
    detailedPosition?: string
    nationality?: string
    shirtNumber?: number
    providerUpdatedAt?: string
  }>
}

type ImportPreview = {
  seasonKey?: string
  normalization?: {
    duplicateMemberships: DuplicateMembership[]
  }
}

type ReviewDecision = {
  providerPlayerId: string
  activeClubProviderId: string
  reviewerId: string
  reviewerNote?: string
  decidedAt: string
}

type ReviewDecisionFile = {
  version: 1
  updatedAt: string
  decisions: Record<string, ReviewDecision>
}

const PREVIEW_PATH = path.join(process.cwd(), 'tmp', 'market-import-preview.json')
const DECISIONS_PATH = path.join(process.cwd(), 'tmp', 'market-import-review-decisions.json')
const PROGRESS_PATH = path.join(process.cwd(), 'tmp', 'market-import-progress.json')

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8')
  return JSON.parse(content) as T
}

async function readClubNameMap(): Promise<Map<string, string>> {
  try {
    const progress = await readJson<{
      completedClubProviderIds: string[]
      playersPerClub: Record<string, number>
    }>(PROGRESS_PATH)

    const ids = progress.completedClubProviderIds
    const names = Object.keys(progress.playersPerClub)
    const map = new Map<string, string>()

    const count = Math.min(ids.length, names.length)
    for (let index = 0; index < count; index += 1) {
      map.set(ids[index], names[index])
    }

    return map
  } catch {
    return new Map()
  }
}

export async function readImportReviewDecisions(): Promise<ReviewDecisionFile> {
  try {
    const file = await readJson<ReviewDecisionFile>(DECISIONS_PATH)
    if (file.version !== 1 || typeof file.decisions !== 'object') {
      throw new Error('Invalid review decision file')
    }
    return file
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      decisions: {},
    }
  }
}

export async function saveImportReviewDecision(input: {
  providerPlayerId: string
  activeClubProviderId: string
  reviewerId: string
  reviewerNote?: string
}): Promise<void> {
  const existing = await readImportReviewDecisions()

  existing.decisions[input.providerPlayerId] = {
    providerPlayerId: input.providerPlayerId,
    activeClubProviderId: input.activeClubProviderId,
    reviewerId: input.reviewerId,
    reviewerNote: input.reviewerNote,
    decidedAt: new Date().toISOString(),
  }
  existing.updatedAt = new Date().toISOString()

  await mkdir(path.dirname(DECISIONS_PATH), { recursive: true })
  await writeFile(DECISIONS_PATH, JSON.stringify(existing, null, 2), 'utf8')
}

export async function getUnresolvedMembershipReviewItems(): Promise<Array<{
  providerPlayerId: string
  clubs: Array<{ providerClubId: string; clubName: string }>
  reason: string
  classification: string
  evidence: DuplicateMembership['evidence']
  reviewedDecision?: ReviewDecision
}>> {
  const preview = await readJson<ImportPreview>(PREVIEW_PATH)
  const decisions = await readImportReviewDecisions()
  const clubNameMap = await readClubNameMap()

  const unresolved = (preview.normalization?.duplicateMemberships ?? []).filter((item) => item.requiresReview)

  return unresolved.map((item) => ({
    providerPlayerId: item.providerPlayerId,
    clubs: item.clubs.map((clubId) => ({
      providerClubId: clubId,
      clubName: clubNameMap.get(clubId) ?? `Club ${clubId}`,
    })),
    reason: item.reason,
    classification: item.classification,
    evidence: item.evidence,
    reviewedDecision: decisions.decisions[item.providerPlayerId],
  }))
}
