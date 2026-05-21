import { expect, test } from '@playwright/test'
import {
  admin,
  attachCoverage,
  createOidcApplication,
  createThirdPartyApplication,
  createUser,
  latestVerificationValue,
  resetAndBootstrap,
  signIn,
  signOut,
} from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('hosted identifier-first sign-in carries the identifier into password auth', async ({ page }, testInfo) => {
  await signIn(page)
  await page.request.patch('/api/management/sign-in-settings', {
    data: { signIn: { identifierFirst: true } },
  })
  await signOut(page)

  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in to FlareAuth' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Email or username' }).fill(admin.username)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(`Signing in as${admin.username}`)).toBeVisible()
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/profile')

  await attachCoverage(testInfo, ['identifier-first-sign-in'])
})

test('hosted sign-up, sign-in, and Account Center run as one real journey', async ({ page }, testInfo) => {
  await page.goto('/sign-up')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Normal Journey User')
  await page.getByLabel('Email').fill('normal-journey@example.com')
  await page.getByLabel('Username').fill('normal-journey')
  await page.getByRole('textbox', { name: 'Password' }).fill('Normal2026Pass')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Account created. Check your email if verification is required.')).toBeVisible()

  await page.goto('/sign-in')
  await page.getByRole('textbox', { name: 'Email or username' }).fill('normal-journey')
  await page.getByRole('textbox', { name: 'Password' }).fill('Normal2026Pass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/profile')
  await expect(page.getByRole('heading', { name: 'Normal Journey User' })).toBeVisible()

  await attachCoverage(testInfo, ['normal-signup-signin-account'])
})

test('email OTP, verification, and password reset hit real auth endpoints', async ({ page }, testInfo) => {
  await signIn(page)
  await createUser(page, 'otp-user@example.com', 'otp-user')
  await signOut(page)

  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Continue with Email' }).click()
  await page.getByLabel('Email').fill('otp-user@example.com')
  await page.getByRole('button', { name: 'Send code' }).click()
  const signInOtp = latestVerificationValue('otp-user@example.com')
  expect(signInOtp).toBeTruthy()
  await page.getByLabel('Verification code').fill(signInOtp!)
  await page.getByRole('button', { name: 'Verify code' }).click()
  await page.waitForURL('**/profile')
  await signOut(page)

  await page.request.post('/api/auth/email-otp/send-verification-otp', {
    data: { email: 'otp-user@example.com', type: 'email-verification' },
  })
  const verificationOtp = latestVerificationValue('otp-user@example.com')
  expect(verificationOtp).toBeTruthy()
  await page.goto('/email-verification')
  await page.getByRole('textbox', { name: 'Email' }).fill('otp-user@example.com')
  await page.getByLabel('One-time code').fill(verificationOtp!)
  await page.getByRole('button', { name: 'Verify email' }).click()
  await expect(page.getByText('Email verified.')).toBeVisible()

  await page.goto('/forgot-password')
  await page.getByRole('button', { name: 'OTP code' }).click()
  await page.getByLabel('Email').fill('otp-user@example.com')
  await page.getByRole('button', { name: 'Send reset code' }).click()
  const resetOtp = latestVerificationValue('otp-user@example.com')
  expect(resetOtp).toBeTruthy()
  await page.getByLabel('One-time code').fill(resetOtp!)
  await page.getByLabel('New password').fill('OtpReset2026Pass')
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('status')).toContainText('Password reset. You can sign in with the new password.')
  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await page.getByRole('textbox', { name: 'Email or username' }).fill('otp-user')
  await page.getByRole('textbox', { name: 'Password' }).fill('OtpReset2026Pass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/profile')

  await attachCoverage(testInfo, ['email-otp-sign-in', 'email-verification', 'password-recovery'])
})

test('OIDC application context, consent approve and deny, and callback route are exercised', async ({ page }, testInfo) => {
  await signIn(page)
  const trustedApplication = await createOidcApplication(page, 'Hosted Context Client')
  const thirdPartyApplication = await createThirdPartyApplication(page, 'Consent Client')

  await page.goto(
    `/oidc/start?client_id=${trustedApplication.clientId}&redirect_uri=${encodeURIComponent(`${page.url().split('/profile')[0]}/oidc/callback`)}&scope=openid%20profile%20email`,
  )
  await expect(page.getByRole('heading', { name: 'Client callback' })).toBeVisible()

  const consentSearch = new URLSearchParams({
    client_id: thirdPartyApplication.clientId,
    redirect_uri: thirdPartyApplication.redirectUris[0],
    scope: 'openid profile',
    state: 'deny-state',
  })
  await page.goto(`/oauth/consent?${consentSearch.toString()}`)
  await expect(page.getByRole('heading', { name: 'Review application access.' })).toBeVisible()
  await expect(page.getByText('Consent Client')).toBeVisible()
  await page.getByRole('link', { name: 'Deny' }).click()
  await expect(page.getByRole('heading', { name: 'Client callback' })).toBeVisible()

  consentSearch.set('state', 'approve-state')
  await page.goto(`/oauth/consent?${consentSearch.toString()}`)
  await page.getByRole('button', { name: 'Approve access' }).click()
  await expect(page.getByRole('heading', { name: 'ERROR' })).toBeVisible()
  await expect(page.getByText('response_type is required')).toBeVisible()

  await attachCoverage(testInfo, [
    'oidc-hosted-sign-in-context',
    'oidc-client-callback',
    'oauth-consent',
    'oauth-consent-deny',
  ])
})
