import { expect, test } from '@playwright/test'
import { attachCoverage, baseURL, createOidcApplication, createUser, resetAndBootstrap, signIn } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('admin setup checklist does not block Console routes while an OIDC application is missing', async ({
  page,
}, testInfo) => {
  await signIn(page)

  await page.goto('/console/dashboard')
  await expect(page).toHaveURL(/\/console\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.goto('/console/onboarding')
  await expect(page).toHaveURL(/\/console\/onboarding$/)
  await expect(page.getByRole('heading', { name: 'Console setup' })).toBeVisible()

  await createOidcApplication(page, 'Setup Application')
  await page.goto('/console/dashboard')
  await expect(page).toHaveURL(/\/console\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await attachCoverage(testInfo, ['admin-setup-gate', 'admin-onboarding', 'admin-dashboard'])
})

test('admin applications page creates and opens an application', async ({ page }, testInfo) => {
  await signIn(page)
  await createOidcApplication(page, 'Bootstrap Application')

  await page.goto('/console/applications')
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await page.getByRole('button', { name: 'New application' }).click()
  await page.getByLabel('Name').fill('Customer Portal E2E')
  await page.getByLabel('Slug').fill('customer-portal-e2e')
  await page.getByLabel('Redirect URIs').fill(`${baseURL}/oidc/callback`)
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: 'Application created' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Customer Portal E2E')).toBeVisible()
  await attachCoverage(testInfo, ['admin-application-inventory', 'admin-create-application'])
})

test('admin users page creates a user and opens user detail', async ({ page }, testInfo) => {
  await signIn(page)
  await createOidcApplication(page, 'Bootstrap Application')

  await page.goto('/console/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await createUser(page, 'user-e2e@example.com', 'user-e2e')
  await page.reload()

  await expect(page.getByText('user-e2e@example.com')).toBeVisible()
  await page.getByRole('link', { name: /user-e2e@example.com|user-e2e/i }).first().click()
  await expect(page).toHaveURL(/\/console\/users\/.+\/profile/)
  await expect(page.getByRole('heading', { name: /user-e2e|user-e2e@example.com/i })).toBeVisible()
  await attachCoverage(testInfo, ['admin-user-inventory', 'admin-create-user', 'admin-user-detail'])
})

test('admin settings pages load from real management APIs', async ({ page }, testInfo) => {
  await signIn(page)
  await createOidcApplication(page, 'Bootstrap Application')

  const pages = [
    ['/console/sign-in-experience/sign-up-and-sign-in', 'Sign-up and sign-in'],
    ['/console/sign-in-experience/account-center', 'Account Center'],
    ['/console/sign-in-experience/branding', 'Branding'],
    ['/console/mfa', 'Multi-factor authentication'],
    ['/console/security/general', 'General security'],
    ['/console/connectors', 'Connectors'],
    ['/console/tenant-settings/oidc-configs', 'Settings'],
  ] as const

  for (const [path, heading] of pages) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  await attachCoverage(testInfo, [
    'admin-sign-in-settings',
    'admin-account-center-settings',
    'admin-branding-settings',
    'admin-security-policy',
    'admin-social-connector-inventory',
    'admin-deployment-settings',
  ])
})
