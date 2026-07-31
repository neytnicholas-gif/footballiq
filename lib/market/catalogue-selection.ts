import {
  PREMIER_LEAGUE_2026_27_CLUBS,
  type MarketCatalogueRecord,
} from '@/lib/market/catalogue'
import {
  buildCatalogueArtifacts,
  catalogueFingerprint,
  type ValidatedCatalogueArtifact,
} from '@/lib/market/catalogue-pipeline'
import type { PositionGroup } from '@/lib/market/types'

export const CATALOGUE_SELECTION_POLICY_VERSION = 'pl-2026-27-prior-minutes-40-plus-10-v1' as const
export const PRIOR_SEASON_KEY = '2025/26' as const
export const REQUIRED_SELECTED_PLAYERS = 50
export const REQUIRED_CLUBS = 20

export const DATA_PERMISSION_KEYS = [
  'retrieveIdentityAndSquadData',
  'retainAfterResponse',
  'storeInFootballIQDatabase',
  'publiclyDisplayIdentityClubPosition',
  'createDerivedCatalogue',
  'periodicallyRefresh',
  'displayHistoryAfterAccessEnds',
  'useProviderIdsInternally',
  'commercialUse',
  'attributionAndDeletionObligationsRecorded',
] as const

export type DataPermissionKey = typeof DATA_PERMISSION_KEYS[number]

export type DataPermissionApproval = {
  approved: true
  approvedBy: string
  approvedAt: string
  evidenceReference: string
  permissions: Record<DataPermissionKey, true>
}

export type CatalogueSelectionCandidate = {
  seasonKey: string
  priorSeasonKey: string
  providerPlayerId: string
  fullName: string
  clubName: string
  position: PositionGroup
  priorSeasonPremierLeagueMinutes: number
  sourceType: 'approved-provider' | 'licensed-local'
  sourceReference: string
  verifiedAt: string
  isActive: boolean
  currentClubVerified: boolean
  identityVerified: boolean
  eligibilityVerified: boolean
  leagueParticipationVerified: boolean
  reviewFlags: string[]
}

export type CatalogueSelectionInput = {
  permissionApproval: DataPermissionApproval
  candidates: CatalogueSelectionCandidate[]
}

export type SelectionIssueCode =
  | 'MALFORMED_INPUT'
  | 'PERMISSION_NOT_APPROVED'
  | 'INSUFFICIENT_CLUBS'
  | 'INSUFFICIENT_PLAYERS'
  | 'DUPLICATE_STABLE_ID'
  | 'INVALID_CANDIDATE'
  | 'UNRESOLVED_REVIEW_FLAG'
  | 'UNVERIFIED_ELIGIBILITY'
  | 'CLUB_QUOTA_UNFILLED'
  | 'SELECTION_COUNT_MISMATCH'

export type CatalogueSelectionIssue = {
  code: SelectionIssueCode
  providerPlayerId: string | null
  clubName: string | null
  reason: string
}

export type SelectedCandidateReview = CatalogueSelectionCandidate & {
  selectionReason: 'club-quota' | 'competition-extra'
  selectionRank: number
}

export type SelectionValidatedArtifact = ValidatedCatalogueArtifact & {
  selectionPolicyVersion: typeof CATALOGUE_SELECTION_POLICY_VERSION
  permissionEvidenceFingerprint: string
  catalogueFingerprint: string
  unresolvedWarningCount: number
}

export type CatalogueSelectionReport = {
  selectionPolicyVersion: typeof CATALOGUE_SELECTION_POLICY_VERSION
  sourceFingerprint: string
  permissionEvidenceFingerprint: string
  catalogueFingerprint: string | null
  summary: {
    receivedCandidates: number
    eligibleClubs: number
    clubQuotaSelected: number
    competitionExtraSelected: number
    selected: number
    rejected: number
    unresolvedWarnings: number
    blockingErrors: number
  }
  clubQuotas: Array<{ clubName: string; selectedProviderPlayerIds: string[]; valid: boolean }>
  selected: SelectedCandidateReview[]
  rejected: CatalogueSelectionIssue[]
  approvalAllowed: boolean
}

export type CatalogueSelectionResult = {
  validated: SelectionValidatedArtifact
  report: CatalogueSelectionReport
  approvalTemplate: {
    approved: false
    selectionPolicyVersion: typeof CATALOGUE_SELECTION_POLICY_VERSION
    catalogueFingerprint: string | null
    permissionEvidenceFingerprint: string
    reviewer: string
    reviewedAt: string
    unresolvedWarningsConfirmed: false
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function permissionApproval(value: unknown): DataPermissionApproval | null {
  if (!isObject(value) || value.approved !== true || typeof value.approvedBy !== 'string' ||
      typeof value.approvedAt !== 'string' || !Number.isFinite(Date.parse(value.approvedAt)) ||
      typeof value.evidenceReference !== 'string' || !value.approvedBy.trim() || !value.evidenceReference.trim() ||
      !isObject(value.permissions)) return null
  const permissions = value.permissions as Record<string, unknown>
  if (!DATA_PERMISSION_KEYS.every((key) => permissions[key] === true)) return null
  return value as DataPermissionApproval
}

function parseCandidate(value: unknown): CatalogueSelectionCandidate | null {
  if (!isObject(value)) return null
  const position = value.position
  const reviewFlags = value.reviewFlags
  if (!['GK', 'DEF', 'MID', 'FWD'].includes(String(position)) || !Array.isArray(reviewFlags) ||
      !reviewFlags.every((flag) => typeof flag === 'string')) return null
  const candidate = value as unknown as CatalogueSelectionCandidate
  const stringFields: Array<keyof CatalogueSelectionCandidate> = [
    'seasonKey', 'priorSeasonKey', 'providerPlayerId', 'fullName', 'clubName',
    'sourceType', 'sourceReference', 'verifiedAt',
  ]
  if (stringFields.some((field) => typeof candidate[field] !== 'string')) return null
  if (!Number.isSafeInteger(candidate.priorSeasonPremierLeagueMinutes) || candidate.priorSeasonPremierLeagueMinutes < 0) return null
  return candidate
}

function stableIdCompare(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' })
}

function rankingCompare(left: CatalogueSelectionCandidate, right: CatalogueSelectionCandidate): number {
  return right.priorSeasonPremierLeagueMinutes - left.priorSeasonPremierLeagueMinutes ||
    stableIdCompare(left.providerPlayerId, right.providerPlayerId)
}

function toCatalogueRecord(candidate: CatalogueSelectionCandidate): MarketCatalogueRecord {
  return {
    seasonKey: candidate.seasonKey,
    providerPlayerId: candidate.providerPlayerId,
    fullName: candidate.fullName,
    clubName: candidate.clubName,
    position: candidate.position,
    sourceType: candidate.sourceType,
    sourceReference: candidate.sourceReference,
    verifiedAt: candidate.verifiedAt,
    isActive: candidate.isActive,
  }
}

function candidateIssue(candidate: CatalogueSelectionCandidate): CatalogueSelectionIssue | null {
  if (candidate.reviewFlags.length > 0) {
    return { code: 'UNRESOLVED_REVIEW_FLAG', providerPlayerId: candidate.providerPlayerId, clubName: candidate.clubName, reason: candidate.reviewFlags.join('; ') }
  }
  if (!candidate.currentClubVerified || !candidate.identityVerified || !candidate.eligibilityVerified || !candidate.leagueParticipationVerified) {
    return { code: 'UNVERIFIED_ELIGIBILITY', providerPlayerId: candidate.providerPlayerId, clubName: candidate.clubName, reason: 'Current club, identity, eligibility and 2026/27 participation must all be explicitly verified.' }
  }
  if (candidate.priorSeasonKey !== PRIOR_SEASON_KEY) {
    return { code: 'INVALID_CANDIDATE', providerPlayerId: candidate.providerPlayerId, clubName: candidate.clubName, reason: `Prior-season minutes must be for ${PRIOR_SEASON_KEY}.` }
  }
  const validation = buildCatalogueArtifacts({ records: [toCatalogueRecord(candidate)] })
  if (validation.report.summary.blockingErrors > 0) {
    return { code: 'INVALID_CANDIDATE', providerPlayerId: candidate.providerPlayerId, clubName: candidate.clubName, reason: validation.report.rejected.map((item) => item.reason).join('; ') }
  }
  return null
}

export function selectCatalogueCandidates(input: unknown): CatalogueSelectionResult {
  const sourceFingerprint = catalogueFingerprint(input)
  const raw = isObject(input) ? input : null
  const approval = permissionApproval(raw?.permissionApproval)
  const rawCandidates = Array.isArray(raw?.candidates) ? raw.candidates : []
  const parsed = rawCandidates.map(parseCandidate)
  const candidates = parsed.filter((candidate): candidate is CatalogueSelectionCandidate => Boolean(candidate))
  const issues: CatalogueSelectionIssue[] = []

  if (!raw || !Array.isArray(raw.candidates)) {
    issues.push({ code: 'MALFORMED_INPUT', providerPlayerId: null, clubName: null, reason: 'Input must contain permissionApproval and a candidates array.' })
  }
  if (!approval) {
    issues.push({ code: 'PERMISSION_NOT_APPROVED', providerPlayerId: null, clubName: null, reason: 'Every data-permission item requires explicit written human approval.' })
  }
  parsed.forEach((candidate, index) => {
    if (!candidate) issues.push({ code: 'INVALID_CANDIDATE', providerPlayerId: null, clubName: null, reason: `Candidate at index ${index} is malformed.` })
  })

  const idCounts = new Map<string, number>()
  for (const candidate of candidates) idCounts.set(candidate.providerPlayerId, (idCounts.get(candidate.providerPlayerId) ?? 0) + 1)
  for (const candidate of candidates) {
    if ((idCounts.get(candidate.providerPlayerId) ?? 0) > 1) {
      issues.push({ code: 'DUPLICATE_STABLE_ID', providerPlayerId: candidate.providerPlayerId, clubName: candidate.clubName, reason: 'Stable provider player ID occurs more than once.' })
    }
    const issue = candidateIssue(candidate)
    if (issue) issues.push(issue)
  }

  const clubsPresent = new Set(candidates.map((candidate) => candidate.clubName).filter((club) => PREMIER_LEAGUE_2026_27_CLUBS.includes(club as never)))
  if (clubsPresent.size < REQUIRED_CLUBS) {
    issues.push({ code: 'INSUFFICIENT_CLUBS', providerPlayerId: null, clubName: null, reason: `Expected candidates for ${REQUIRED_CLUBS} eligible clubs; found ${clubsPresent.size}.` })
  }
  if (candidates.length < REQUIRED_SELECTED_PLAYERS) {
    issues.push({ code: 'INSUFFICIENT_PLAYERS', providerPlayerId: null, clubName: null, reason: `At least ${REQUIRED_SELECTED_PLAYERS} candidates are required; found ${candidates.length}.` })
  }

  const clubSelected: SelectedCandidateReview[] = []
  const clubQuotas = PREMIER_LEAGUE_2026_27_CLUBS.map((clubName) => {
    const ranked = candidates.filter((candidate) => candidate.clubName === clubName).sort(rankingCompare)
    const chosen = ranked.slice(0, 2)
    if (chosen.length !== 2) issues.push({ code: 'CLUB_QUOTA_UNFILLED', providerPlayerId: null, clubName, reason: 'Club does not have two ranked candidates; no substitute was invented.' })
    chosen.forEach((candidate, index) => clubSelected.push({ ...candidate, selectionReason: 'club-quota', selectionRank: index + 1 }))
    return { clubName, selectedProviderPlayerIds: chosen.map((candidate) => candidate.providerPlayerId), valid: chosen.length === 2 }
  })

  const selectedIds = new Set(clubSelected.map((candidate) => candidate.providerPlayerId))
  const extras = candidates
    .filter((candidate) => !selectedIds.has(candidate.providerPlayerId))
    .sort(rankingCompare)
    .slice(0, 10)
    .map((candidate, index): SelectedCandidateReview => ({ ...candidate, selectionReason: 'competition-extra', selectionRank: index + 1 }))
  const proposed = [...clubSelected, ...extras]
  if (proposed.length !== REQUIRED_SELECTED_PLAYERS) {
    issues.push({ code: 'SELECTION_COUNT_MISMATCH', providerPlayerId: null, clubName: null, reason: `Selection produced ${proposed.length}, not exactly ${REQUIRED_SELECTED_PLAYERS}.` })
  }

  const uniqueIssues = [...new Map(issues.map((issue) => [`${issue.code}\u0000${issue.providerPlayerId}\u0000${issue.clubName}\u0000${issue.reason}`, issue])).values()]
  const approvalAllowed = uniqueIssues.length === 0 && proposed.length === REQUIRED_SELECTED_PLAYERS
  const records = approvalAllowed ? proposed.map(toCatalogueRecord).sort((left, right) => stableIdCompare(left.providerPlayerId, right.providerPlayerId)) : []
  const base = buildCatalogueArtifacts({ records })
  const permissionEvidenceFingerprint = catalogueFingerprint(approval ?? null)
  const selectedFingerprint = approvalAllowed ? catalogueFingerprint(base.validated.records) : null
  const validated: SelectionValidatedArtifact = {
    ...base.validated,
    sourceFingerprint,
    selectionPolicyVersion: CATALOGUE_SELECTION_POLICY_VERSION,
    permissionEvidenceFingerprint,
    catalogueFingerprint: selectedFingerprint ?? '',
    unresolvedWarningCount: uniqueIssues.length,
    blockingErrorCount: uniqueIssues.length + base.validated.blockingErrorCount,
  }

  return {
    validated,
    report: {
      selectionPolicyVersion: CATALOGUE_SELECTION_POLICY_VERSION,
      sourceFingerprint,
      permissionEvidenceFingerprint,
      catalogueFingerprint: selectedFingerprint,
      summary: {
        receivedCandidates: rawCandidates.length,
        eligibleClubs: clubsPresent.size,
        clubQuotaSelected: clubSelected.length,
        competitionExtraSelected: extras.length,
        selected: proposed.length,
        rejected: uniqueIssues.length,
        unresolvedWarnings: uniqueIssues.length,
        blockingErrors: uniqueIssues.length + base.validated.blockingErrorCount,
      },
      clubQuotas,
      selected: proposed,
      rejected: uniqueIssues,
      approvalAllowed,
    },
    approvalTemplate: {
      approved: false,
      selectionPolicyVersion: CATALOGUE_SELECTION_POLICY_VERSION,
      catalogueFingerprint: selectedFingerprint,
      permissionEvidenceFingerprint,
      reviewer: '',
      reviewedAt: '',
      unresolvedWarningsConfirmed: false,
    },
  }
}
