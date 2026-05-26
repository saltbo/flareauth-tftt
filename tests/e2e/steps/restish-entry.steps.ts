import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { admin, createUser, signIn } from '../helpers/real-app'
import { createRestishHome, removeRestishHome, restish, startRestishAuthHeader } from '../helpers/restish'
import type { FlareAuthWorld } from '../support/world'

Given('I am signed in to Console', async function (this: FlareAuthWorld) {
  await signIn(this.requirePage)
  await this.requirePage.goto('/console')
  await expect(this.requirePage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

Given('the system-managed FlareAuth CLI OAuth client exists', async function (this: FlareAuthWorld) {
  await this.configureRestish()
})

Given('I authenticate the Restish CLI through the built-in OAuth client', async function (this: FlareAuthWorld) {
  await this.configureRestish()
  await approveRestishAccess(this)
})

When('a Management API client requests service discovery', async function (this: FlareAuthWorld) {
  await this.configureRestish()
  await discoverManagementApi(this)
})

When('Restish signs in through Authorization Code with PKCE', async function (this: FlareAuthWorld) {
  await approveRestishAccess(this)
})

When('I create, update, list, and delete an application with Restish', async function (this: FlareAuthWorld) {
  await exerciseRestishApplicationCrud(this)
})

Then(/^\/api\/management\/openapi\.json returns the OpenAPI 3\.1 contract$/, async function (this: FlareAuthWorld) {
  const response = await this.requirePage.request.get('/api/management/openapi.json')
  assert.equal(response.status(), 200, await response.text())
  assert.equal((await response.json()).openapi, '3.1.0')
})

Then(
  'Management API responses advertise the contract with Restish-compatible Link headers',
  async function (this: FlareAuthWorld) {
    const response = await this.requirePage.request.get('/api/management/readiness')
    assert.match(response.headers().link ?? '', /\/api\/management\/openapi\.json/)
  },
)

Then('Restish exposes generated Management commands', async function (this: FlareAuthWorld) {
  const restishHome = requireRestishHome(this)
  const help = await restish(['flareauth-local', '--help'], restishHome)
  assert.match(help, /list-applications/)
  assert.match(help, /get-readiness/)

  const commandHelp = await restish(['flareauth-local', 'get-readiness', '--help'], restishHome)
  assert.match(commandHelp, /Get deployment readiness/)
})

Then(
  'the client uses client_id {string} without a client secret',
  async function (this: FlareAuthWorld, clientId: string) {
    const authorizeUrl = requireAuthorizeUrl(this)
    assert.equal(authorizeUrl.searchParams.get('client_id'), clientId)
    assert.equal(authorizeUrl.searchParams.has('client_secret'), false)
  },
)

Then(
  /^the callback redirects to http:\/\/127\.0\.0\.1:8484\/callback or http:\/\/localhost:8484\/callback$/,
  async function (this: FlareAuthWorld) {
    const callbackUrl = requireCallbackUrl(this)
    assert.match(callbackUrl.origin, /^http:\/\/(127\.0\.0\.1|localhost):8484$/)
    assert.equal(callbackUrl.pathname, '/callback')
    assert.ok(callbackUrl.searchParams.get('code'))
  },
)

Then('Management API requests with an administrator Bearer token are accepted', async function (this: FlareAuthWorld) {
  const authorization = requireAuthorization(this)
  const response = await this.requirePage.request.get('/api/management/readiness', {
    headers: { authorization },
  })
  assert.equal(response.status(), 200, await response.text())
})

Then('Management API requests with a non-admin Bearer token are rejected', async function (this: FlareAuthWorld) {
  const username = `restish-user-${Date.now()}`
  await createUser(this.requirePage, `${username}@example.com`, username)
  const nonAdminAuthorization = await authorizeRestishAccess(this, username, 'user2026pass')
  const response = await this.requirePage.request.get('/api/management/readiness', {
    headers: { authorization: nonAdminAuthorization },
  })
  assert.equal(response.status(), 403, await response.text())
})

Then('the Management API applies each application change', async function (this: FlareAuthWorld) {
  await assertDeletedRestishApplication(this)
})

Given('restish is configured for the Management API', async function (this: FlareAuthWorld) {
  await this.configureRestish()
})

When('restish discovers the Management API', async function (this: FlareAuthWorld) {
  await discoverManagementApi(this)
})

When('the admin approves Restish OAuth access', async function (this: FlareAuthWorld) {
  await approveRestishAccess(this)
})

When('restish creates, updates, lists, and deletes an application', async function (this: FlareAuthWorld) {
  await exerciseRestishApplicationCrud(this)
})

Then('the deleted Restish application is gone from the Management API', async function (this: FlareAuthWorld) {
  await assertDeletedRestishApplication(this)
})

async function discoverManagementApi(world: FlareAuthWorld) {
  const page = world.requirePage
  const restishHome = requireRestishHome(world)
  const contractResponse = await page.request.get('/api/management/openapi.json')
  assert.equal(contractResponse.status(), 200, await contractResponse.text())
  assert.equal((await contractResponse.json()).openapi, '3.1.0')

  const readinessResponse = await page.request.get('/api/management/readiness')
  assert.match(readinessResponse.headers().link ?? '', /\/api\/management\/openapi\.json/)
  await restish(['api', 'sync', 'flareauth-local'], restishHome)
}

async function approveRestishAccess(world: FlareAuthWorld) {
  if (!world.restishHome) await world.configureRestish()
  if (world.restishAuthorization) return
  const page = world.requirePage
  const auth = await startRestishAuthHeader(requireRestishHome(world))
  world.restishAuthorizeUrl = auth.authorizeUrl
  const authorizeUrl = new URL(auth.authorizeUrl)
  assert.equal(authorizeUrl.searchParams.get('client_id'), 'flareauth-cli')
  assert.equal(authorizeUrl.searchParams.get('redirect_uri'), 'http://localhost:8484/callback')

  await page.goto(auth.authorizeUrl)
  await page.getByRole('textbox', { name: 'Email or username' }).fill(admin.username)
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Review application access.' })).toBeVisible()
  await expect(page.getByText('FlareAuth CLI')).toBeVisible()
  const callbackUrl = page.waitForURL(/^http:\/\/(127\.0\.0\.1|localhost):8484\/callback.*/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Approve access' }).click()
  await callbackUrl
  world.restishCallbackUrl = page.url()

  world.restishAuthorization = await auth.authHeader()
}

async function authorizeRestishAccess(world: FlareAuthWorld, username: string, password: string) {
  if (!world.browser) throw new Error('Scenario browser has not been created.')
  const home = await createRestishHome(`${world.baseURL}/api/management`)
  const context = await world.browser.newContext({ baseURL: world.baseURL })
  const page = await context.newPage()

  try {
    const auth = await startRestishAuthHeader(home)
    await page.goto(auth.authorizeUrl)
    await page.getByRole('textbox', { name: 'Email or username' }).fill(username)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Review application access.' })).toBeVisible()
    await page.getByRole('button', { name: 'Approve access' }).click()
    return await auth.authHeader()
  } finally {
    await context.close()
    await removeRestishHome(home)
  }
}

async function exerciseRestishApplicationCrud(world: FlareAuthWorld) {
  const restishHome = requireRestishHome(world)
  const authorization = requireAuthorization(world)
  const headers = ['-H', `Authorization: ${authorization}`, '-H', 'Content-Type: application/json']
  const authHeader = ['-H', `Authorization: ${authorization}`]
  const slug = `restish-cucumber-${Date.now()}`

  const created = await restishJson(restishHome, ['create-application', ...headers], {
    name: 'Restish Cucumber Application',
    slug,
    clientType: 'public_spa',
    redirectUris: [`${world.baseURL}/oidc/callback`],
    firstParty: true,
    trusted: true,
  })
  assert.equal(created.slug, slug)
  assert.equal(created.name, 'Restish Cucumber Application')
  assert.equal(typeof created.clientId, 'string')
  assert.equal(created.clientSecret, undefined)

  const applicationId = stringField(created, 'id')
  const updated = await restishJson(restishHome, ['update-application', applicationId, ...headers], {
    name: 'Restish Cucumber Application Updated',
  })
  assert.equal(updated.id, applicationId)
  assert.equal(updated.name, 'Restish Cucumber Application Updated')

  const listed = await restishJson(restishHome, ['list-applications', ...authHeader])
  assert.ok(arrayField(listed, 'applications').some((application) => application.id === applicationId))

  await restish(['flareauth-local', 'delete-application', applicationId, ...authHeader], restishHome)
  world.restishApplicationId = applicationId
}

async function assertDeletedRestishApplication(world: FlareAuthWorld) {
  const applicationId = world.restishApplicationId
  if (!applicationId) throw new Error('Restish application id was not captured.')
  const response = await world.requirePage.request.get(`/api/management/applications/${applicationId}`)
  assert.equal(response.status(), 404, await response.text())
}

async function restishJson(restishHome: NonNullable<FlareAuthWorld['restishHome']>, args: string[], input?: unknown) {
  return JSON.parse(await restish(['flareauth-local', ...args, '-o', 'json'], restishHome, input)) as Record<
    string,
    unknown
  >
}

function requireRestishHome(world: FlareAuthWorld) {
  if (!world.restishHome) throw new Error('Restish home has not been configured.')
  return world.restishHome
}

function requireAuthorization(world: FlareAuthWorld) {
  if (!world.restishAuthorization) throw new Error('Restish authorization was not captured.')
  return world.restishAuthorization
}

function requireAuthorizeUrl(world: FlareAuthWorld) {
  if (!world.restishAuthorizeUrl) throw new Error('Restish authorization URL was not captured.')
  return new URL(world.restishAuthorizeUrl)
}

function requireCallbackUrl(world: FlareAuthWorld) {
  if (!world.restishCallbackUrl) throw new Error('Restish callback URL was not captured.')
  return new URL(world.restishCallbackUrl)
}

function stringField(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'string') throw new Error(`Expected ${field} to be a string.`)
  return fieldValue
}

function arrayField(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field]
  if (!Array.isArray(fieldValue)) throw new Error(`Expected ${field} to be an array.`)
  return fieldValue as Array<Record<string, unknown>>
}
