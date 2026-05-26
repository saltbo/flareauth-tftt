import { expect, type Page, test } from '@playwright/test'
import { attachCoverage, baseURL, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('hosted auth previews use the same enabled sign-in methods as the real hosted card', async ({
  browser,
  page,
}, testInfo) => {
  await signIn(page)

  const settings = await page.request.get('/api/management/sign-in-settings').then((response) => response.json())
  const security = await page.request.get('/api/management/security/policy').then((response) => response.json())

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: true } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: {
        passwordEnabled: settings.signIn.passwordEnabled,
        emailOtpEnabled: true,
        socialLoginEnabled: settings.signIn.socialLoginEnabled,
      },
      builtInProviders: {
        oneTap: {
          ...settings.builtInProviders.oneTap,
          enabled: true,
          clientId: 'e2e-onetap-client',
        },
      },
    },
  })

  const publicContext = await browser.newContext({ baseURL })
  const publicPage = await publicContext.newPage()
  await publicPage.goto('/auth/sign-in')
  await expect(publicPage.getByRole('button', { name: 'Continue with Email' })).toBeVisible()
  await expect(publicPage.getByRole('button', { name: 'Continue with Passkey' })).toBeVisible()
  await expect(publicPage.getByRole('button', { name: 'Continue with OneTap' })).toBeVisible()
  await publicContext.close()

  await expectPreviewMethods(page, '/console/sign-in-experience/content')
  await expectPreviewMethods(page, '/console/sign-in-experience/branding')

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: security.policy.passkeys.enabled } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: {
        passwordEnabled: settings.signIn.passwordEnabled,
        emailOtpEnabled: settings.signIn.emailOtpEnabled,
        socialLoginEnabled: settings.signIn.socialLoginEnabled,
      },
      builtInProviders: { oneTap: settings.builtInProviders.oneTap },
    },
  })

  await attachCoverage(testInfo, ['hosted-preview-consistency', 'onetap-flow', 'passkey-flow', 'email-otp-sign-in'])
})

async function expectPreviewMethods(page: Page, path: string) {
  await page.goto(path)
  const preview = page.getByLabel('Hosted authentication preview')
  await expect(preview.getByRole('button', { name: 'Continue with Email' })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Continue with Passkey' })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Continue with OneTap' })).toBeVisible()
}
