import { expect, test } from '@playwright/test'
import { admin, attachCoverage, resetAndBootstrap, signIn, signOut, trackProjectErrors } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('account center loads account navigation and profile page', async ({ page }, testInfo) => {
  const failedProjectResponses = trackProjectErrors(page)

  await signIn(page)

  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: admin.name })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Account center' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Profile settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Security settings' })).toHaveCount(0)
  await expect(page.getByText('Provider not found')).toHaveCount(0)
  expect(failedProjectResponses).toEqual([])
  await attachCoverage(testInfo, ['password-sign-in', 'account-center'])
})

test('account center sections use sibling routes', async ({ page }, testInfo) => {
  await signIn(page)

  for (const [path, region] of [
    ['/profile', 'Profile settings'],
    ['/security', 'Security settings'],
    ['/connections', 'Linked accounts'],
  ] as const) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('navigation', { name: 'Account center' })).toBeVisible()
    await expect(page.getByRole('region', { name: region })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByRole('link', { name: 'Console' })).toHaveAttribute('href', '/console')

  await attachCoverage(testInfo, ['account-section-routes', 'account-admin-console-entry'])
})

test('profile edits are saved through real account APIs and dialog UI', async ({ page }, testInfo) => {
  await signIn(page)

  await page.getByRole('button', { name: 'Edit display name' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Edit display name' })).toBeVisible()
  await page.getByLabel('Display name').fill('FlareAuth Admin E2E')
  await page.getByRole('button', { name: 'Save display name' }).click()

  await expect(page.getByRole('heading', { name: 'FlareAuth Admin E2E' })).toBeVisible()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await attachCoverage(testInfo, ['profile-update'])
})

test('account center changes password and signs out', async ({ page }, testInfo) => {
  await signIn(page)
  await page.goto('/security')

  await page.getByRole('button', { name: 'Change password' }).click()
  await page.getByLabel('Current password').fill(admin.password)
  await page.getByLabel('New password').fill('Rotate2026Pass')
  await page.getByRole('dialog').getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed.')).toBeVisible()

  await signOut(page)
  await signIn(page, 'Rotate2026Pass')
  await expect(page.getByRole('heading', { name: admin.name })).toBeVisible()
  await attachCoverage(testInfo, ['password-update', 'sign-out'])
})
