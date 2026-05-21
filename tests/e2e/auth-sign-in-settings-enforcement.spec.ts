import { expect, test } from '@playwright/test'
import { admin, attachCoverage, baseURL, resetAndBootstrap, signIn, signOut } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('Passwordless mode removes password UI and blocks native password sign-in endpoints', async ({
  browser,
  page,
}, testInfo) => {
  await signIn(page)
  await page.request.patch('/api/management/sign-in-settings', {
    data: { signIn: { passwordEnabled: false } },
  })
  await signOut(page)

  await page.goto('/sign-in')
  await expect(page.getByRole('textbox', { name: 'Email or username' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Password' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0)

  const signedOutContext = await browser.newContext({ baseURL })
  const directPasswordResponse = await signedOutContext.request.post('/api/auth/sign-in/username', {
    data: { username: admin.username, password: admin.password },
  })
  expect(directPasswordResponse.status(), await directPasswordResponse.text()).toBe(403)
  await signedOutContext.close()

  await attachCoverage(testInfo, ['passwordless-linkage', 'password-sign-in'])
})

test('disabled sign-up blocks hosted registration UI and the direct sign-up API', async ({ browser, page }, testInfo) => {
  await signIn(page)
  await page.request.patch('/api/management/sign-in-settings', {
    data: { signIn: { signupEnabled: false } },
  })
  await signOut(page)

  await page.goto('/sign-in')
  await expect(page.getByRole('link', { name: 'Create account' })).toHaveCount(0)

  await page.goto('/sign-up')
  await expect(page.getByText('Sign up is not available')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0)

  const signedOutContext = await browser.newContext({ baseURL })
  const signUpResponse = await signedOutContext.request.post('/api/auth/sign-up/email', {
    data: {
      email: 'blocked-signup@example.com',
      name: 'Blocked Signup',
      password: 'BlockedSignup2026Pass',
      username: 'blocked-signup',
    },
  })
  expect(signUpResponse.status(), await signUpResponse.text()).toBe(403)
  await signedOutContext.close()

  await attachCoverage(testInfo, ['sign-up-disabled', 'sign-up'])
})
