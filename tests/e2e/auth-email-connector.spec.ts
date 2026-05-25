import { expect, type Page, test } from '@playwright/test'
import { admin, attachCoverage, latestVerificationValue, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('Email connector drawer controls hosted email-code sign-in and backend enforcement', async ({
  page,
}, testInfo) => {
  await setEmailCodeEnabled(page, false)

  await page.context().clearCookies()
  await page.goto('/sign-in')
  await expect(page.getByRole('button', { name: 'Continue with Email' })).toHaveCount(0)

  const disabledResponse = await page.request.post('/api/auth/email-otp/send-verification-otp', {
    data: { email: admin.email, type: 'sign-in' },
  })
  expect(disabledResponse.status(), await disabledResponse.text()).toBe(403)

  await page.goto('/email-verification')
  await expect(page.getByRole('textbox', { name: 'One-time code' })).toBeVisible()
  const verificationResponse = await page.request.post('/api/auth/email-otp/send-verification-otp', {
    data: { email: admin.email, type: 'email-verification' },
  })
  expect(verificationResponse.status(), await verificationResponse.text()).toBeLessThan(400)
  const verificationCode = latestVerificationValue(admin.email)
  expect(verificationCode).toBeTruthy()
  const verifyEmailResponse = await page.request.post('/api/auth/email-otp/verify-email', {
    data: { email: admin.email, otp: verificationCode },
  })
  expect(verifyEmailResponse.status(), await verifyEmailResponse.text()).toBeLessThan(400)

  await setEmailCodeEnabled(page, true)

  await page.context().clearCookies()
  await page.goto('/sign-in')
  await expect(page.getByRole('button', { name: 'Continue with Email' })).toBeVisible()

  const enabledResponse = await page.request.post('/api/auth/email-otp/send-verification-otp', {
    data: { email: admin.email, type: 'sign-in' },
  })
  expect(enabledResponse.status(), await enabledResponse.text()).toBeLessThan(400)

  await attachCoverage(testInfo, ['connectors-email', 'email-otp', 'email-verification'])
})

async function setEmailCodeEnabled(page: Page, enabled: boolean) {
  await signIn(page)
  await page.goto('/console/connectors')
  await page.getByRole('button', { name: /^Email Email sign-in provider/ }).click()

  const switchControl = page.getByRole('dialog', { name: 'Email' }).getByRole('switch', { name: 'Enabled' })
  if ((await switchControl.getAttribute('aria-checked')) !== String(enabled)) {
    await switchControl.click()
  }

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /^Email Email sign-in provider/ })).toContainText(
    enabled ? 'Runtime enabled' : 'Runtime disabled',
  )
}
