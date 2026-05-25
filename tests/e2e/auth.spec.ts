import { expect, test } from '@playwright/test'
import { admin, attachCoverage, bootstrapAdmin, migrate, resetAndBootstrap, resetLocalData, signIn } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test('api health smoke returns platform status', async ({ page }, testInfo) => {
  await resetAndBootstrap()

  const response = await page.request.get('/api/health')
  await expect(response).toBeOK()
  await expect(response.json()).resolves.toMatchObject({ ok: true, service: 'flareauth' })
  await attachCoverage(testInfo, ['api-health-smoke'])
})

test('fresh deployment redirects hosted routes to first-admin onboarding and creates first admin', async ({
  page,
}, testInfo) => {
  migrate()
  resetLocalData()

  await page.goto('/sign-in')
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(admin.name)
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Username').fill(admin.username)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Create first admin' }).click()

  await expect(page.getByText('First admin created. Sign in to finish Console setup.')).toBeVisible()
  await attachCoverage(testInfo, ['first-admin-gate', 'public-onboarding'])
})

test('root and protected account routes redirect according to auth state', async ({ page }, testInfo) => {
  await resetAndBootstrap()

  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in/)

  await page.goto('/profile')
  await expect(page).toHaveURL(/\/sign-in/)
  expect(new URL(page.url()).searchParams.get('return_to')).toBe('/profile')

  await signIn(page)
  await page.goto('/')
  await expect(page).toHaveURL(/\/profile$/)

  await attachCoverage(testInfo, ['root-signed-out-redirect', 'signed-out-account-redirect', 'root-signed-in-redirect'])
})

test('hosted sign-up creates an account through the real auth endpoint', async ({ page }, testInfo) => {
  await resetAndBootstrap()

  await page.goto('/sign-up')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Signup User')
  await page.getByLabel('Email').fill('signup@example.com')
  await page.getByLabel('Username').fill('signup-user')
  await page.getByRole('textbox', { name: 'Password' }).fill('Create2026Pass')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Account created. Check your email if verification is required.')).toBeVisible()
  await attachCoverage(testInfo, ['sign-up'])
})

test('hosted callback errors show recovery UI', async ({ page }, testInfo) => {
  await resetAndBootstrap()

  await page.goto('/auth/callback?error=access_denied&error_description=Denied')
  await expect(page.getByRole('heading', { name: 'Sign-in could not continue.' })).toBeVisible()
  await expect(page.getByText('Denied')).toBeVisible()
  await attachCoverage(testInfo, ['hosted-auth-error-flow'])
})
