import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const specsDir = fileURLToPath(new URL('../specs', import.meta.url))
const e2eCoveragePath = fileURLToPath(new URL('../specs/e2e-coverage.json', import.meta.url))
const e2eCoverage = JSON.parse(readFileSync(e2eCoveragePath, 'utf8'))

const sourceSpecJourneys = readFeatureTags(specsDir, /@journey:([a-z0-9-]+)/g)
const e2eJourneys = readE2eJourneys(specsDir)
const specEntrypoints = readFeatureTags(specsDir, /@entrypoint:([a-z0-9-]+)/g)
const requiredEntrypoints = new Set(e2eCoverage.requiredEntrypoints ?? [])
const automatedJourneys = new Set(e2eCoverage.automatedJourneys ?? [])
const errors = []

if (existsSync(fileURLToPath(new URL('../playwright.config.ts', import.meta.url)))) {
  errors.push('playwright.config.ts must not exist; Cucumber owns E2E execution.')
}

for (const file of readdirSync(fileURLToPath(new URL('../tests/e2e', import.meta.url)), { recursive: true })) {
  if (typeof file !== 'string') continue
  if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) {
    errors.push(`tests/e2e/${file} must be migrated to Cucumber; direct Playwright specs are not allowed.`)
  }
  if (file.endsWith('.feature')) {
    errors.push(`tests/e2e/${file} must move to specs/; feature files are product specs, not test glue.`)
  }
}

for (const journey of automatedJourneys) {
  if (!sourceSpecJourneys.has(journey)) {
    errors.push(`Automated E2E journey "${journey}" is not defined in specs/*.feature.`)
  }
  if (!e2eJourneys.has(journey)) {
    errors.push(`Automated E2E journey "${journey}" is not tagged @e2e in specs/*.feature.`)
  }
}

for (const journey of e2eJourneys) {
  if (!automatedJourneys.has(journey)) {
    errors.push(`@e2e journey "${journey}" is not declared in specs/e2e-coverage.json.`)
  }
}

for (const entrypoint of requiredEntrypoints) {
  if (!specEntrypoints.has(entrypoint)) {
    errors.push(`Missing spec entrypoint "${entrypoint}".`)
  }
}

for (const entrypoint of specEntrypoints) {
  if (!requiredEntrypoints.has(entrypoint)) {
    errors.push(`Unknown spec entrypoint "${entrypoint}".`)
  }
}

for (const issue of validateSpecFeatures(specsDir, requiredEntrypoints)) {
  errors.push(issue)
}

if (errors.length > 0) {
  console.error(`Spec verification failed in ${repoRoot}:`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(
  [
    `Spec verification passed: ${sourceSpecJourneys.size} source journeys,`,
    `${e2eJourneys.size} automated Cucumber journeys,`,
    `${specEntrypoints.size} spec entrypoints.`,
  ].join(' '),
)

function readFeatureTags(directory, pattern) {
  const tags = new Set()
  for (const file of readdirSync(directory, { recursive: true })) {
    if (typeof file !== 'string' || !file.endsWith('.feature')) continue
    const source = readFileSync(join(directory, file), 'utf8')
    for (const match of source.matchAll(pattern)) {
      tags.add(match[1])
    }
  }
  return tags
}

function readE2eJourneys(directory) {
  const journeys = new Set()
  for (const file of readdirSync(directory, { recursive: true })) {
    if (typeof file !== 'string' || !file.endsWith('.feature')) continue
    const source = readFileSync(join(directory, file), 'utf8')
    let pendingTags = []
    for (const line of source.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('@')) {
        pendingTags = trimmed.split(/\s+/)
        continue
      }
      if (/^Scenario:/.test(trimmed) && pendingTags.includes('@e2e')) {
        for (const tag of pendingTags) {
          const match = tag.match(/^@journey:([a-z0-9-]+)$/)
          if (match) journeys.add(match[1])
        }
      }
      if (trimmed && !trimmed.startsWith('@')) pendingTags = []
    }
  }
  return journeys
}

function validateSpecFeatures(directory, requiredEntrypoints) {
  const issues = []
  for (const file of readdirSync(directory, { recursive: true })) {
    if (typeof file !== 'string' || !file.endsWith('.feature')) continue
    const source = readFileSync(join(directory, file), 'utf8')

    let pendingTags = []
    for (const [index, line] of source.split('\n').entries()) {
      const trimmed = line.trim()
      if (trimmed.startsWith('@')) {
        pendingTags = trimmed.split(/\s+/)
        continue
      }
      if (/^Scenario:/.test(trimmed) && !pendingTags.some((tag) => tag.startsWith('@journey:'))) {
        issues.push(`${join('specs', file)}:${index + 1} scenario is missing @journey:<id>.`)
      }
      if (/^Scenario:/.test(trimmed)) {
        const entrypointTags = pendingTags.filter((tag) => tag.startsWith('@entrypoint:'))
        if (entrypointTags.length !== 1) {
          issues.push(`${join('specs', file)}:${index + 1} scenario must declare exactly one @entrypoint:<id> tag.`)
        } else {
          const entrypoint = entrypointTags[0].replace('@entrypoint:', '')
          if (!requiredEntrypoints.has(entrypoint)) {
            issues.push(`${join('specs', file)}:${index + 1} scenario declares unsupported entrypoint "${entrypoint}".`)
          }
        }
      }
      if (trimmed && !trimmed.startsWith('@')) pendingTags = []
    }
  }
  return issues
}
