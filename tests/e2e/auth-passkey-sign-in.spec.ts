import { expect, test } from '@playwright/test'
import { attachCoverage, resetAndBootstrap, signIn, signOut } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('Profile passkey enrollment can be used for hosted passkey sign-in', async ({ page }, testInfo) => {
  await signIn(page)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  await page.goto('/security')
  await page.getByRole('button', { name: 'Add passkey' }).click()
  await page.getByLabel('Passkey name').fill('Hosted Sign-in Passkey')
  await page.getByRole('dialog').getByRole('button', { name: 'Add passkey' }).click()
  await expect(page.getByText('Passkey enrolled.')).toBeVisible()
  await expect(page.getByText('Hosted Sign-in Passkey')).toBeVisible()

  await signOut(page)
  await page.getByRole('button', { name: 'Continue with Passkey' }).click()
  await page.waitForURL('**/profile')
  await expect(page.getByRole('heading', { name: 'FlareAuth Admin' })).toBeVisible()

  await attachCoverage(testInfo, ['passkey-flow', 'passkey-sign-in'])
})
