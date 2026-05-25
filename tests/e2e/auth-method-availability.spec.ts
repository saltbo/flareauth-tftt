import { expect, test } from '@playwright/test'
import { attachCoverage, baseURL, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('hosted sign-in does not show an empty-method warning when Phone is the only enabled method', async ({
  browser,
  page,
}, testInfo) => {
  await signIn(page)
  const signInSettings = await page.request.get('/api/management/sign-in-settings').then((response) => response.json())
  const security = await page.request.get('/api/management/security/policy').then((response) => response.json())

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: false } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: { passwordEnabled: false, emailOtpEnabled: false, socialLoginEnabled: false },
      builtInProviders: {
        email: {
          ...signInSettings.builtInProviders.email,
          enabled: false,
        },
        phone: {
          ...signInSettings.builtInProviders.phone,
          enabled: true,
          twilioAccountSid: 'AC00000000000000000000000000000000',
          twilioAuthToken: 'token',
          twilioFromNumber: '+15555550100',
        },
      },
    },
  })

  const signedOutContext = await browser.newContext({ baseURL })
  const signedOutPage = await signedOutContext.newPage()
  await signedOutPage.goto('/sign-in')
  await expect(signedOutPage.getByRole('button', { name: 'Continue with Phone' })).toBeVisible()
  await expect(
    signedOutPage.getByText('No sign-in methods are enabled. Contact the workspace administrator.'),
  ).toHaveCount(0)
  await expect(signedOutPage.getByRole('button', { name: 'Continue with Email' })).toHaveCount(0)
  await expect(signedOutPage.getByRole('button', { name: 'Sign in' })).toHaveCount(0)
  await signedOutContext.close()

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: security.policy.passkeys.enabled } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: {
        passwordEnabled: signInSettings.signIn.passwordEnabled,
        emailOtpEnabled: signInSettings.signIn.emailOtpEnabled,
        socialLoginEnabled: signInSettings.signIn.socialLoginEnabled,
      },
      builtInProviders: {
        email: signInSettings.builtInProviders.email,
        phone: signInSettings.builtInProviders.phone,
      },
    },
  })

  await attachCoverage(testInfo, ['sign-in-method-availability', 'phone-sign-in'])
})
