import { expect, test } from '@playwright/test'
import { attachCoverage, e2eConnector, resetAndBootstrap, seedConnector, signIn } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('unavailable connectors are not exposed to sign-in or account linking', async ({ page }, testInfo) => {
  seedConnector({ clientSecret: null })

  const config = await page.request.get('/api/configz').then((response) => response.json())
  expect(config.identityProviders).toEqual([])

  await page.goto('/sign-in')
  await expect(page.getByRole('button', { name: /E2E OAuth/i })).toHaveCount(0)

  await signIn(page)
  await expect(page.getByText('No sign-in connectors are available.')).toBeVisible()
  await expect(page.getByText('Provider not found')).toHaveCount(0)
  await attachCoverage(testInfo, ['public-sign-in', 'linked-account-unlink'])
})

test('available OAuth connectors render with icons and link through the real backend endpoint', async ({
  page,
}, testInfo) => {
  seedConnector({ clientSecret: e2eConnector.clientSecret })

  const config = await page.request.get('/api/configz').then((response) => response.json())
  expect(config.identityProviders).toEqual([
    expect.objectContaining({
      providerType: e2eConnector.providerType,
      providerId: e2eConnector.providerId,
      displayName: e2eConnector.displayName,
    }),
  ])

  await page.route('https://idp.e2e.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>External IdP</title><h1>External IdP boundary</h1>',
    })
  })

  await signIn(page)
  const linkResponse = page.waitForResponse(
    (response) => response.url().includes('/api/auth/oauth2/link') && response.request().method() === 'POST',
  )
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: e2eConnector.displayName }) })
    .getByRole('button', { name: 'Connect' })
    .click()

  const response = await linkResponse
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: 'External IdP boundary' })).toBeVisible()
  await expect(page.getByText('Provider not found')).toHaveCount(0)
  await attachCoverage(testInfo, ['linked-account-unlink'])
})
