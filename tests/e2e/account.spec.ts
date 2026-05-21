import { expect, test } from '@playwright/test'
import { admin, attachCoverage, resetAndBootstrap, signIn, signOut, trackProjectErrors } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('account center loads profile, security, sessions, connections, and apps', async ({ page }, testInfo) => {
  const failedProjectResponses = trackProjectErrors(page)

  await signIn(page)

  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: admin.name })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Profile settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Security settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Social and app access' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Session management' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revoke other sessions' })).toBeVisible()
  await expect(page.getByText('Provider not found')).toHaveCount(0)
  expect(failedProjectResponses).toEqual([])
  await attachCoverage(testInfo, ['password-sign-in', 'account-center'])
})

test('profile edits are saved through real account APIs and dialog UI', async ({ page }, testInfo) => {
  await signIn(page)

  await page.getByRole('button', { name: 'Edit profile' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Edit profile' })).toBeVisible()
  await page.getByLabel('Display name').fill('FlareAuth Admin E2E')
  await page.getByRole('button', { name: 'Save profile' }).click()

  await expect(page.getByRole('heading', { name: 'FlareAuth Admin E2E' })).toBeVisible()
  await expect(page.getByText('Profile updated.')).toBeVisible()
  await attachCoverage(testInfo, ['profile-update'])
})

test('legacy account and profile deep links resolve to the account center', async ({ page }, testInfo) => {
  await signIn(page)

  for (const path of ['/account', '/account/security', '/profile/security', '/profile/linked-accounts', '/profile/sessions']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByRole('heading', { name: admin.name })).toBeVisible()
  }

  await attachCoverage(testInfo, ['account-deep-links'])
})

test('account center changes password and signs out', async ({ page }, testInfo) => {
  await signIn(page)

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
