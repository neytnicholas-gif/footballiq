import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  selectCatalogueCandidates,
  type CatalogueSelectionReport,
} from '../lib/market/catalogue-selection'

const ROOT = path.join(process.cwd(), 'tmp', 'market-catalogue')
const VALIDATED_PATH = path.join(ROOT, 'validated', 'catalogue.validated.json')
const REPORT_JSON_PATH = path.join(ROOT, 'reports', 'catalogue.selection-review.json')
const REPORT_MD_PATH = path.join(ROOT, 'reports', 'catalogue.selection-review.md')
const TEMPLATE_PATH = path.join(ROOT, 'reports', 'catalogue.approval-template.json')

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

function markdownReport(report: CatalogueSelectionReport): string {
  const selected = report.selected.map((row) =>
    `| ${row.selectionReason} | ${row.selectionRank} | ${row.providerPlayerId} | ${row.fullName} | ${row.clubName} | ${row.position} | ${row.priorSeasonPremierLeagueMinutes} | ${row.sourceReference} |`,
  )
  const rejected = report.rejected.map((row) =>
    `| ${row.code} | ${row.providerPlayerId ?? '-'} | ${row.clubName ?? '-'} | ${row.reason.replaceAll('|', '\\|')} |`,
  )
  return `# Catalogue Selection Review\n\n` +
    `Policy: \`${report.selectionPolicyVersion}\`\n\n` +
    `Catalogue fingerprint: \`${report.catalogueFingerprint ?? 'BLOCKED'}\`\n\n` +
    `Permission evidence fingerprint: \`${report.permissionEvidenceFingerprint}\`\n\n` +
    `Approval allowed: **${report.approvalAllowed ? 'YES' : 'NO'}**\n\n` +
    `## Summary\n\n- Candidates: ${report.summary.receivedCandidates}\n- Eligible clubs: ${report.summary.eligibleClubs}\n- Club quota: ${report.summary.clubQuotaSelected}\n- Competition extras: ${report.summary.competitionExtraSelected}\n- Proposed selected: ${report.summary.selected}\n- Blocking errors: ${report.summary.blockingErrors}\n\n` +
    `## Proposed selection\n\n| Reason | Rank | Provider ID | Name | Club | Position | 2025/26 PL minutes | Provenance |\n|---|---:|---|---|---|---|---:|---|\n${selected.join('\n') || '| - | - | - | - | - | - | - | No selection |'}\n\n` +
    `## Rejected or unresolved\n\n| Code | Provider ID | Club | Reason |\n|---|---|---|---|\n${rejected.join('\n') || '| - | - | - | None |'}\n`
}

async function main() {
  const inputPath = argumentValue('--input')
  if (!inputPath) throw new Error('Usage: npm run market:catalogue:select -- --input <licensed-provider-export.json>')
  const input = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as unknown
  const result = selectCatalogueCandidates(input)

  for (const outputPath of [VALIDATED_PATH, REPORT_JSON_PATH, REPORT_MD_PATH, TEMPLATE_PATH]) {
    await mkdir(path.dirname(outputPath), { recursive: true })
  }
  await writeFile(VALIDATED_PATH, `${JSON.stringify(result.validated, null, 2)}\n`, 'utf8')
  await writeFile(REPORT_JSON_PATH, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8')
  await writeFile(REPORT_MD_PATH, markdownReport(result.report), 'utf8')
  await writeFile(TEMPLATE_PATH, `${JSON.stringify(result.approvalTemplate, null, 2)}\n`, 'utf8')

  console.log(`Selection policy: ${result.report.selectionPolicyVersion}`)
  console.log(`Selected: ${result.report.summary.selected}`)
  console.log(`Blocking errors: ${result.report.summary.blockingErrors}`)
  console.log(`Approval allowed: ${result.report.approvalAllowed ? 'YES' : 'NO'}`)
  console.log(`Human review: ${REPORT_MD_PATH}`)
  if (!result.report.approvalAllowed) {
    console.error('BLOCKED: Resolve every selection, eligibility and permission issue. No substitutions were made.')
    process.exitCode = 1
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown selection error')
  process.exitCode = 1
})
