import { Given } from '@cucumber/cucumber'
import { bootstrapAdmin, migrate, resetAndBootstrap, resetLocalData } from '../helpers/real-app'
import type { FlareAuthWorld } from '../support/world'

Given('the Cloudflare Worker is running in E2E mode', async function (this: FlareAuthWorld) {
  const response = await this.requirePage.request.get('/api/health')
  if (response.status() !== 200) throw new Error(`Expected /api/health 200, got ${response.status()}.`)
  const body = (await response.json()) as { ok?: boolean; service?: string }
  if (body.ok !== true || body.service !== 'flareauth') {
    throw new Error(`Unexpected E2E health response: ${JSON.stringify(body)}`)
  }
})

Given('the D1 database can be reset and migrated', async function (this: FlareAuthWorld) {
  migrate()
  resetLocalData()
  const response = await this.requirePage.request.get('/api/onboarding/status')
  if (response.status() !== 200) {
    throw new Error(`Expected /api/onboarding/status 200 after reset, got ${response.status()}.`)
  }
  const body = (await response.json()) as { required?: boolean }
  if (body.required !== true)
    throw new Error(`Expected reset deployment to require onboarding: ${JSON.stringify(body)}`)
})

Given('a first admin exists', async () => {
  await resetAndBootstrap()
})

Given(/^hosted auth reads runtime settings from \/api\/configz$/, async function (this: FlareAuthWorld) {
  const response = await this.requirePage.request.get('/api/configz')
  if (response.status() !== 200) throw new Error(`Expected /api/configz 200, got ${response.status()}.`)
})

Given('no users exist', async () => {
  migrate()
  resetLocalData()
})

Given('the local deployment has no tenant data', async () => {
  migrate()
  resetLocalData()
})

Given('the local deployment has a bootstrapped admin', async () => {
  await resetAndBootstrap()
})

Given('the local deployment has an admin user without console setup', async () => {
  migrate()
  resetLocalData()
  await bootstrapAdmin()
})
