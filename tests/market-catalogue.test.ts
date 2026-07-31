import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildCatalogueArtifacts, catalogueFingerprint } from '../lib/market/catalogue-pipeline'
import { loadPublicCatalogueState, type CatalogueApprovalManifest } from '../lib/market/public-catalogue-loader'

function player(overrides: Record<string, unknown> = {}) { return { internalId: 'fiq_player_0001', displayName: 'Reviewed Player', currentValueMinor: 125, availabilityStatus: 'available', valueHistory: [{ effectiveAt: '2026-08-01T00:00:00.000Z', valueMinor: 125 }], ...overrides } }
function catalogue(players: unknown[] = [player()]) { return { schemaVersion: 1, catalogueKey: 'footballiq-manual-v1', players } }
function approval(fingerprint: string): CatalogueApprovalManifest { return { version: 1, approved: true, catalogueFingerprint: fingerprint, reviewer: 'Nicholas', approvedAt: '2026-08-01T10:00:00.000Z', declaration: { independentlySelected: true, noSystematicThirdPartyCopy: true, originalFootballIQValues: true, manuallyReviewed: true, confusingIdentitiesResolved: true } } }

test('manual catalogue is deterministic and accepts one to fifty players', () => {
  const one = buildCatalogueArtifacts(catalogue())
  const fifty = buildCatalogueArtifacts(catalogue(Array.from({ length: 50 }, (_, i) => player({ internalId: `fiq_player_${String(i + 1).padStart(4, '0')}`, displayName: `Reviewed Player ${i + 1}` }))))
  assert.equal(one.report.approvalAllowed, true); assert.equal(fifty.report.approvalAllowed, true)
  assert.equal(one.validated.catalogueFingerprint, buildCatalogueArtifacts(catalogue()).validated.catalogueFingerprint)
  assert.equal(buildCatalogueArtifacts(catalogue([])).report.approvalAllowed, false)
  assert.equal(buildCatalogueArtifacts(catalogue(Array.from({ length: 51 }, (_, i) => player({ internalId: `fiq_player_${i + 1}`, displayName: `Player ${i + 1}` })))).report.approvalAllowed, false)
})

test('IDs, names, values, statuses and histories fail closed', () => {
  const cases = [
    player({ internalId: 'provider-1' }), player({ displayName: '' }),
    player({ currentValueMinor: 1.5 }), player({ currentValueMinor: 201 }),
    player({ availabilityStatus: 'injured' }), player({ valueHistory: [] }),
    player({ valueHistory: [{ effectiveAt: 'bad', valueMinor: 125 }] }),
    player({ valueHistory: [{ effectiveAt: '2026-08-02T00:00:00Z', valueMinor: 120 }, { effectiveAt: '2026-08-01T00:00:00Z', valueMinor: 125 }] }),
    player({ valueHistory: [{ effectiveAt: '2026-08-01T00:00:00Z', valueMinor: 120 }] }),
    player({ providerPlayerId: 'forbidden' }),
  ]
  for (const invalid of cases) assert.equal(buildCatalogueArtifacts(catalogue([invalid])).report.approvalAllowed, false)
})

test('duplicate IDs and confusing names block the entire catalogue', () => {
  const result = buildCatalogueArtifacts(catalogue([player(), player({ internalId: 'fiq_player_0002', displayName: 'Reviewed-Player' })]))
  assert.equal(result.validated.records.length, 0)
  assert.ok(result.report.issues.some((issue) => issue.code === 'DUPLICATE_OR_CONFUSING_NAME'))
  const duplicate = buildCatalogueArtifacts(catalogue([player(), player({ displayName: 'Other Player' })]))
  assert.ok(duplicate.report.issues.some((issue) => issue.code === 'DUPLICATE_INTERNAL_ID'))
})

test('fixture markers and unknown fields can never activate', () => {
  assert.equal(buildCatalogueArtifacts({ ...catalogue(), fixture: true }).report.approvalAllowed, false)
  assert.equal(buildCatalogueArtifacts({ ...catalogue(), source: 'provider' }).report.approvalAllowed, false)
})

test('runtime requires an exact approval and every declaration', async () => {
  const built = buildCatalogueArtifacts(catalogue())
  const root = await mkdtemp(path.join(tmpdir(), 'footballiq-manual-'))
  const validatedPath = path.join(root, 'validated.json'); const approvalPath = path.join(root, 'approval.json')
  await writeFile(validatedPath, JSON.stringify(built.validated))
  assert.equal((await loadPublicCatalogueState({ validatedPath, approvalPath })).available, false)
  await writeFile(approvalPath, JSON.stringify(approval(catalogueFingerprint(built.validated.records))))
  assert.equal((await loadPublicCatalogueState({ validatedPath, approvalPath })).available, true)
  await writeFile(approvalPath, JSON.stringify({ ...approval(built.validated.catalogueFingerprint), catalogueFingerprint: 'tampered' }))
  assert.equal((await loadPublicCatalogueState({ validatedPath, approvalPath })).available, false)
  const changed = buildCatalogueArtifacts(catalogue([player({ currentValueMinor: 126, valueHistory: [{ effectiveAt: '2026-08-01T00:00:00.000Z', valueMinor: 126 }] })]))
  assert.notEqual(changed.validated.catalogueFingerprint, built.validated.catalogueFingerprint)
})
