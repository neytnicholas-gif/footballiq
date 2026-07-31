import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import {
  buildCatalogueArtifacts,
  catalogueFingerprint,
  serializeCatalogueArtifact,
} from '../lib/market/catalogue-pipeline'
import {
  loadPublicCatalogueState,
  type CatalogueApprovalManifest,
} from '../lib/market/public-catalogue-loader'
import { MARKET_RULES } from '../lib/market/settings'

function validRecord(overrides: Record<string, unknown> = {}) {
  return {
    seasonKey: '2026/27',
    providerPlayerId: 'provider-player-1',
    fullName: 'Approved Player',
    clubName: 'Coventry City',
    position: 'MID',
    sourceType: 'approved-provider',
    sourceReference: 'approved-provider:players:provider-player-1',
    verifiedAt: '2026-07-31T08:00:00.000Z',
    isActive: true,
    ...overrides,
  }
}

test('valid 2026/27 record is accepted with deterministic output', () => {
  const first = buildCatalogueArtifacts({ records: [validRecord()] })
  const second = buildCatalogueArtifacts({ records: [validRecord()] })

  assert.equal(first.report.summary.accepted, 1)
  assert.equal(first.report.summary.blockingErrors, 0)
  assert.equal(first.validated.records[0].providerPlayerId, 'provider-player-1')
  assert.equal(serializeCatalogueArtifact(first.validated), serializeCatalogueArtifact(second.validated))
  assert.equal(first.validated.sourceFingerprint, second.validated.sourceFingerprint)
})

test('stale, ineligible, missing, invalid and generated records are rejected with reasons', () => {
  const result = buildCatalogueArtifacts({
    records: [
      validRecord({ providerPlayerId: 'stale', seasonKey: '2024/25' }),
      validRecord({ providerPlayerId: 'club', clubName: 'Southampton' }),
      validRecord({ providerPlayerId: '' }),
      validRecord({ providerPlayerId: 'source', sourceReference: '' }),
      validRecord({ providerPlayerId: 'date', verifiedAt: 'not-a-date' }),
      validRecord({ providerPlayerId: 'generated', sourceType: 'generated' }),
      validRecord({ providerPlayerId: 'position', position: 'Unknown' }),
    ],
  })

  assert.equal(result.report.summary.accepted, 0)
  assert.deepEqual(result.report.rejected.map((item) => item.code), [
    'STALE_SEASON',
    'INELIGIBLE_CLUB',
    'MISSING_STABLE_ID',
    'UNVERIFIED_SOURCE',
    'INVALID_VERIFIED_AT',
    'UNSUPPORTED_SOURCE',
    'INVALID_POSITION',
  ])
})

test('duplicate provider IDs and ambiguous duplicate identities are fully blocked', () => {
  const result = buildCatalogueArtifacts({
    records: [
      validRecord({ providerPlayerId: 'duplicate-id', fullName: 'First Identity' }),
      validRecord({ providerPlayerId: 'duplicate-id', fullName: 'Second Identity' }),
      validRecord({ providerPlayerId: 'identity-a', fullName: 'Ambiguous Player' }),
      validRecord({ providerPlayerId: 'identity-b', fullName: 'Ambiguous Player' }),
    ],
  })

  assert.equal(result.report.summary.accepted, 0)
  assert.deepEqual(result.report.rejected.map((item) => item.code), [
    'DUPLICATE_IDENTITY',
    'DUPLICATE_IDENTITY',
    'AMBIGUOUS_IDENTITY',
    'AMBIGUOUS_IDENTITY',
  ])
})

test('malformed input and malformed records fail safely without partial activation', () => {
  const malformedInput = buildCatalogueArtifacts('not-an-object')
  const malformedRecords = buildCatalogueArtifacts({ records: [null, validRecord()] })

  assert.equal(malformedInput.report.rejected[0].code, 'MALFORMED_INPUT')
  assert.equal(malformedInput.validated.records.length, 0)
  assert.equal(malformedRecords.report.summary.accepted, 1)
  assert.equal(malformedRecords.report.summary.blockingErrors, 1)
})

async function writeRuntimeArtifacts(options: {
  validated: ReturnType<typeof buildCatalogueArtifacts>['validated']
  approval?: CatalogueApprovalManifest
}) {
  const root = await mkdtemp(path.join(tmpdir(), 'footballiq-catalogue-test-'))
  const validatedPath = path.join(root, 'validated.json')
  const approvalPath = path.join(root, 'approval.json')
  await writeFile(validatedPath, JSON.stringify(options.validated), 'utf8')
  if (options.approval) await writeFile(approvalPath, JSON.stringify(options.approval), 'utf8')
  return { validatedPath, approvalPath }
}

test('closed market remains when catalogue is missing, partially invalid or unapproved', async () => {
  const missingRoot = await mkdtemp(path.join(tmpdir(), 'footballiq-catalogue-missing-'))
  const missing = await loadPublicCatalogueState({
    validatedPath: path.join(missingRoot, 'missing-validated.json'),
    approvalPath: path.join(missingRoot, 'missing-approval.json'),
  })
  assert.equal(missing.available, false)
  assert.deepEqual(missing.records, [])

  const partial = buildCatalogueArtifacts({ records: [validRecord(), null] })
  const partialPaths = await writeRuntimeArtifacts({ validated: partial.validated })
  const partialState = await loadPublicCatalogueState(partialPaths)
  assert.equal(partialState.available, false)
  assert.deepEqual(partialState.records, [])

  const valid = buildCatalogueArtifacts({ records: [validRecord()] })
  const unapprovedPaths = await writeRuntimeArtifacts({ validated: valid.validated })
  const unapproved = await loadPublicCatalogueState(unapprovedPaths)
  assert.equal(unapproved.available, false)
  assert.deepEqual(unapproved.records, [])
})

test('generic validation cannot bypass deterministic selection even with a matching approval', async () => {
  const result = buildCatalogueArtifacts({ records: [validRecord()] })
  const approval: CatalogueApprovalManifest = {
    version: 1,
    approved: true,
    catalogueFingerprint: catalogueFingerprint(result.validated.records),
    permissionEvidenceFingerprint: 'permission-fingerprint',
    selectionPolicyVersion: 'pl-2026-27-prior-minutes-40-plus-10-v1',
    reviewer: 'catalogue-reviewer',
    approvedAt: '2026-07-31T09:00:00.000Z',
  }
  const paths = await writeRuntimeArtifacts({ validated: result.validated, approval })
  const state = await loadPublicCatalogueState(paths)

  assert.equal(state.available, false)
  assert.equal(state.records.length, 0)
})

test('direct player routes remain blocked when the public catalogue is closed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'footballiq-direct-player-test-'))
  const state = await loadPublicCatalogueState({
    validatedPath: path.join(root, 'missing.json'),
    approvalPath: path.join(root, 'missing-approval.json'),
  })

  assert.equal(state.available, false)
  assert.deepEqual(state.records, [])
})

test('portfolio limits remain five holdings, three buys and three sales', () => {
  assert.equal(MARKET_RULES.maximumHoldings, 5)
  assert.equal(MARKET_RULES.maximumDailyPurchases, 3)
  assert.equal(MARKET_RULES.maximumDailySales, 3)
})
