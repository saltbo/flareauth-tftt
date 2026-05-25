import { expect, test } from '@playwright/test'
import { attachCoverage, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('MFA policy controls TOTP enrollment and required-enrollment API access', async ({ page }, testInfo) => {
  await signIn(page)
  const security = await page.request.get('/api/management/security/policy').then((response) => response.json())
  const originalMfaPolicy = security.policy.mfa

  await page.request.patch('/api/management/security/policy', {
    data: {
      policy: {
        mfa: {
          ...originalMfaPolicy,
          authenticatorAppEnabled: false,
        },
      },
    },
  })

  const disabledEnrollment = await page.request.post('/api/account/security/mfa/totp-enrollment', {
    data: { password: 'admin2026' },
  })
  expect(disabledEnrollment.status()).toBe(400)
  await expect(disabledEnrollment.json()).resolves.toMatchObject({
    error: { message: 'Authenticator app MFA is disabled for this deployment.' },
  })

  await page.request.patch('/api/management/security/policy', {
    data: {
      policy: {
        mfa: {
          ...originalMfaPolicy,
          mode: 'required',
        },
      },
    },
  })

  const protectedProfile = await page.request.get('/api/account/profile')
  expect(protectedProfile.status()).toBe(403)
  await expect(protectedProfile.json()).resolves.toMatchObject({
    error: { message: 'MFA enrollment is required for this deployment.' },
  })

  const enrollmentState = await page.request.get('/api/account/security')
  expect(enrollmentState.status(), await enrollmentState.text()).toBe(200)

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { mfa: originalMfaPolicy } },
  })

  await attachCoverage(testInfo, ['mfa-policy-enforcement', 'totp-flow'])
})
