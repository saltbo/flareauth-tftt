import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const specsDir = fileURLToPath(new URL('../specs', import.meta.url))
const coveragePath = fileURLToPath(new URL('../tests/e2e/journey-coverage.json', import.meta.url))
const e2eDir = fileURLToPath(new URL('../tests/e2e', import.meta.url))

const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'))
const declaredJourneys = new Set((coverage.journeys ?? []).map((journey) => journey.id))
const waivedJourneys = new Set(coverage.waivers ?? [])

const specFiles = readdirSync(specsDir).filter((file) => file.endsWith('.feature'))
const specJourneys = new Set()

for (const file of specFiles) {
  const source = readFileSync(join(specsDir, file), 'utf8')
  for (const match of source.matchAll(/@journey:([a-z0-9-]+)/g)) {
    specJourneys.add(match[1])
  }
}

const attachedJourneys = new Set()
const e2eFiles = readdirSync(e2eDir)
  .filter((file) => file.endsWith('.spec.ts'))
  .map((file) => join(e2eDir, file))

for (const file of e2eFiles) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/attachCoverage\([^,]+,\s*\[([\s\S]*?)\]\)/g)) {
    for (const journeyMatch of match[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) {
      attachedJourneys.add(journeyMatch[1])
    }
  }
}

const errors = []

for (const journey of declaredJourneys) {
  if (!specJourneys.has(journey)) {
    errors.push(`Missing spec tag for journey "${journey}".`)
  }
}

for (const journey of specJourneys) {
  if (!declaredJourneys.has(journey)) {
    errors.push(`Spec tag "${journey}" is not declared in tests/e2e/journey-coverage.json.`)
  }
}

for (const journey of attachedJourneys) {
  if (!declaredJourneys.has(journey)) {
    errors.push(`Playwright attaches undeclared journey "${journey}".`)
  }
}

for (const journey of declaredJourneys) {
  if (!attachedJourneys.has(journey) && !waivedJourneys.has(journey)) {
    errors.push(`Journey "${journey}" is not attached by any E2E test and has no waiver.`)
  }
}

if (errors.length > 0) {
  console.error(`Spec verification failed in ${repoRoot}:`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(
  `Spec verification passed: ${specJourneys.size} spec journeys, ${attachedJourneys.size} automated journeys.`,
)
