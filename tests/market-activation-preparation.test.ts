import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { PREMIER_LEAGUE_2026_27_CLUBS } from '../lib/market/catalogue'
import {
  CATALOGUE_SELECTION_POLICY_VERSION,
  DATA_PERMISSION_KEYS,
  selectCatalogueCandidates,
  type CatalogueSelectionCandidate,
  type CatalogueSelectionInput,
} from '../lib/market/catalogue-selection'
import { loadPublicCatalogueState, type CatalogueApprovalManifest } from '../lib/market/public-catalogue-loader'
import { catalogueFingerprint } from '../lib/market/catalogue-pipeline'

function approvedPermissions() {
  return {
    approved: true as const,
    approvedBy: 'rights-reviewer',
    approvedAt: '2026-07-31T10:00:00.000Z',
    evidenceReference: 'legal-ledger:catalogue-2026-27',
    permissions: Object.fromEntries(DATA_PERMISSION_KEYS.map((key) => [key, true])) as Record<typeof DATA_PERMISSION_KEYS[number], true>,
  }
}

function candidate(clubName: string, clubIndex: number, playerIndex: number): CatalogueSelectionCandidate {
  return {
    seasonKey: '2026/27',
    priorSeasonKey: '2025/26',
    providerPlayerId: String(clubIndex * 100 + playerIndex),
    fullName: `Licensed Candidate ${clubIndex}-${playerIndex}`,
    clubName,
    position: playerIndex % 4 === 0 ? 'GK' : playerIndex % 4 === 1 ? 'DEF' : playerIndex % 4 === 2 ? 'MID' : 'FWD',
    priorSeasonPremierLeagueMinutes: 3000 - playerIndex * 100 - clubIndex,
    sourceType: 'approved-provider',
    sourceReference: `licensed-export:${clubIndex}:${playerIndex}`,
    verifiedAt: '2026-07-31T09:00:00.000Z',
    isActive: true,
    currentClubVerified: true,
    identityVerified: true,
    eligibilityVerified: true,
    leagueParticipationVerified: true,
    reviewFlags: [],
  }
}

function validInput(playersPerClub = 3): CatalogueSelectionInput {
  return {
    permissionApproval: approvedPermissions(),
    candidates: PREMIER_LEAGUE_2026_27_CLUBS.flatMap((club, clubIndex) =>
      Array.from({ length: playersPerClub }, (_, playerIndex) => candidate(club, clubIndex, playerIndex)),
    ),
  }
}

test('40 club-quota players plus 10 competition extras are selected deterministically', () => {
  const input = validInput()
  const first = selectCatalogueCandidates(input)
  const second = selectCatalogueCandidates({ ...input, candidates: [...input.candidates].reverse() })
  assert.equal(first.report.approvalAllowed, true)
  assert.equal(first.report.summary.clubQuotaSelected, 40)
  assert.equal(first.report.summary.competitionExtraSelected, 10)
  assert.equal(first.validated.records.length, 50)
  assert.equal(first.validated.catalogueFingerprint, second.validated.catalogueFingerprint)
  assert.deepEqual(first.validated.records, second.validated.records)
  assert.ok(first.report.clubQuotas.every((quota) => quota.valid && quota.selectedProviderPlayerIds.length === 2))
})

test('equal-minute ties use ascending stable provider ID', () => {
  const input = validInput()
  input.candidates[0].priorSeasonPremierLeagueMinutes = 3000
  input.candidates[1].priorSeasonPremierLeagueMinutes = 3000
  input.candidates[0].providerPlayerId = '20'
  input.candidates[1].providerPlayerId = '3'
  const result = selectCatalogueCandidates(input)
  const quota = result.report.clubQuotas[0]
  assert.deepEqual(quota.selectedProviderPlayerIds.slice(0, 2), ['3', '20'])
})

test('duplicates, unresolved flags and unverified eligibility block without substitution', () => {
  const input = validInput()
  input.candidates[0].reviewFlags = ['transfer requires human confirmation']
  input.candidates[1].currentClubVerified = false
  input.candidates[2].providerPlayerId = input.candidates[3].providerPlayerId
  const result = selectCatalogueCandidates(input)
  assert.equal(result.report.approvalAllowed, false)
  assert.equal(result.validated.records.length, 0)
  assert.equal(result.approvalTemplate.catalogueFingerprint, null)
  assert.ok(result.report.rejected.some((issue) => issue.code === 'UNRESOLVED_REVIEW_FLAG'))
  assert.ok(result.report.rejected.some((issue) => issue.code === 'UNVERIFIED_ELIGIBILITY'))
  assert.ok(result.report.rejected.some((issue) => issue.code === 'DUPLICATE_STABLE_ID'))
})

test('fewer than 20 clubs or 50 candidates fails closed', () => {
  const insufficientClubs = validInput()
  insufficientClubs.candidates = insufficientClubs.candidates.filter((row) => row.clubName !== PREMIER_LEAGUE_2026_27_CLUBS[0])
  const clubResult = selectCatalogueCandidates(insufficientClubs)
  assert.ok(clubResult.report.rejected.some((issue) => issue.code === 'INSUFFICIENT_CLUBS'))
  assert.equal(clubResult.report.approvalAllowed, false)

  const insufficientPlayers = selectCatalogueCandidates(validInput(2))
  assert.ok(insufficientPlayers.report.rejected.some((issue) => issue.code === 'INSUFFICIENT_PLAYERS'))
  assert.equal(insufficientPlayers.report.approvalAllowed, false)
})

test('every permission item requires explicit human approval', () => {
  const input = validInput()
  const permissions = input.permissionApproval.permissions as Record<string, boolean>
  permissions.commercialUse = false
  const result = selectCatalogueCandidates(input)
  assert.ok(result.report.rejected.some((issue) => issue.code === 'PERMISSION_NOT_APPROVED'))
  assert.equal(result.validated.records.length, 0)
})

test('verified zero-minute candidates are eligible but uncertainty remains blocking', () => {
  const verified = validInput()
  verified.candidates[0].priorSeasonPremierLeagueMinutes = 0
  const verifiedResult = selectCatalogueCandidates(verified)
  assert.equal(verifiedResult.report.approvalAllowed, true)
  assert.equal(verifiedResult.report.rejected.some((issue) => issue.providerPlayerId === verified.candidates[0].providerPlayerId), false)

  const uncertain = validInput()
  uncertain.candidates[0].priorSeasonPremierLeagueMinutes = 0
  uncertain.candidates[0].leagueParticipationVerified = false
  const uncertainResult = selectCatalogueCandidates(uncertain)
  assert.equal(uncertainResult.report.approvalAllowed, false)
  assert.ok(uncertainResult.report.rejected.some((issue) => issue.code === 'UNVERIFIED_ELIGIBILITY'))
  assert.equal(uncertainResult.validated.records.length, 0)
})

test('runtime opens only for exact selection, permission and catalogue fingerprints', async () => {
  const result = selectCatalogueCandidates(validInput())
  const root = await mkdtemp(path.join(tmpdir(), 'footballiq-selection-runtime-'))
  const validatedPath = path.join(root, 'validated.json')
  const approvalPath = path.join(root, 'approval.json')
  await writeFile(validatedPath, JSON.stringify(result.validated), 'utf8')
  const approval: CatalogueApprovalManifest = {
    version: 1,
    approved: true,
    catalogueFingerprint: result.validated.catalogueFingerprint,
    permissionEvidenceFingerprint: result.validated.permissionEvidenceFingerprint,
    selectionPolicyVersion: CATALOGUE_SELECTION_POLICY_VERSION,
    reviewer: 'catalogue-reviewer',
    approvedAt: '2026-07-31T11:00:00.000Z',
  }
  assert.equal(approval.catalogueFingerprint, catalogueFingerprint(result.validated.records))
  assert.equal(approval.permissionEvidenceFingerprint, result.validated.permissionEvidenceFingerprint)
  await writeFile(approvalPath, JSON.stringify(approval), 'utf8')
  const opened = await loadPublicCatalogueState({ validatedPath, approvalPath })
  assert.equal(opened.available, true, opened.reason)

  await writeFile(approvalPath, JSON.stringify({ ...approval, permissionEvidenceFingerprint: 'mismatch' }), 'utf8')
  assert.equal((await loadPublicCatalogueState({ validatedPath, approvalPath })).available, false)

  await writeFile(validatedPath, JSON.stringify({ ...result.validated, catalogueFingerprint: 'tampered' }), 'utf8')
  await writeFile(approvalPath, JSON.stringify(approval), 'utf8')
  assert.equal((await loadPublicCatalogueState({ validatedPath, approvalPath })).available, false)
})
