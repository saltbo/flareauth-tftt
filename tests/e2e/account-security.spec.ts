import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  admin,
  attachCoverage,
  createOidcApplication,
  currentUserId,
  latestVerificationValue,
  resetAndBootstrap,
  seedAuthorizedApplication,
  signIn,
  signOut,
} from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('account center updates avatar and requests email change through dialogs', async ({ page }, testInfo) => {
  await signIn(page)

  await page.getByRole('button', { name: 'Change avatar' }).click()
  await page.getByLabel('Avatar image').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.getByText('Avatar uploaded.')).toBeVisible()
  await page.getByRole('button', { name: 'Save avatar' }).click()
  await expect(page.getByText('Profile updated.')).toBeVisible()

  await page.getByRole('button', { name: 'Change email' }).click()
  await page.getByRole('dialog').getByLabel('Email').fill('admin-next@example.com')
  await page.getByRole('dialog').getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByText('Verification code sent.')).toBeVisible()
  const emailOtp = latestVerificationValue('admin-next@example.com')
  expect(emailOtp).toBeTruthy()
  await page.getByRole('dialog').getByLabel('Verification code').fill(emailOtp!)
  await page.getByRole('dialog').getByRole('button', { name: 'Verify code' }).click()
  await expect(page.getByText('admin-next@example.com')).toBeVisible()
  await expect(page.getByText('Verified')).toBeVisible()

  await attachCoverage(testInfo, ['profile-avatar-upload', 'email-update'])
})

test('account center revokes other sessions and authorized application access', async ({ browser, page }, testInfo) => {
  await signIn(page)
  const application = await createOidcApplication(page, 'Authorized App E2E')
  const userId = currentUserId()
  expect(userId).toBeTruthy()
  seedAuthorizedApplication({
    applicationId: application.id,
    clientId: application.clientId,
    userId: userId!,
    name: application.name,
  })

  const secondContext = await browser.newContext({ baseURL: page.url().split('/profile')[0] })
  const secondPage = await secondContext.newPage()
  await signIn(secondPage)

  await page.goto('/connections')
  await expect(page.getByText('Authorized App E2E')).toBeVisible()
  await page
    .getByRole('article')
    .filter({ hasText: 'Authorized App E2E' })
    .getByRole('button', { name: 'Revoke' })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke access' }).click()
  await expect(page.getByText('Application access revoked.')).toBeVisible()

  await page.goto('/security')
  await page.getByRole('button', { name: 'Revoke other sessions' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke sessions' }).click()
  await expect(page.getByText('Other sessions revoked.')).toBeVisible()
  await secondContext.close()

  await attachCoverage(testInfo, ['session-revocation', 'authorized-app-revoke'])
})

test('TOTP enrollment verifies a real code and passkey enrollment completes with WebAuthn', async ({ page }, testInfo) => {
  await signIn(page)
  await page.goto('/security')

  await page.getByRole('button', { name: 'Enroll authenticator app' }).click()
  await page.getByRole('dialog').getByLabel('Password').fill(admin.password)
  await page.getByRole('dialog').getByRole('button', { name: 'Enroll authenticator app' }).click()
  const secretText = await page.locator('.setupPanel code').first().textContent()
  const secret = readTotpSecret(secretText ?? '')
  expect(secret).toBeTruthy()
  await waitForStableTotpWindow(page)
  await page.getByLabel('Authenticator code').fill(totp(secret))
  await page.getByRole('dialog').getByRole('button', { name: 'Verify code' }).click()
  await expect(page.getByText('MFA enabled.')).toBeVisible()

  await signOut(page)
  await page.getByRole('textbox', { name: 'Email or username' }).fill(admin.username)
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password)
  const signInResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/auth/sign-in/username') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign in' }).click()
  const signInResponse = await signInResponsePromise
  await expect(signInResponse.json()).resolves.toMatchObject({
    twoFactorRedirect: true,
    twoFactorMethods: ['totp'],
  })
  await expect(page.getByRole('heading', { name: 'Verify your sign-in' })).toBeVisible()
  await waitForStableTotpWindow(page)
  await page.getByLabel('Authenticator code').fill(totp(secret))
  await page.getByRole('button', { name: 'Verify code' }).click()
  await page.waitForURL('**/profile')
  await page.goto('/security')

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

  await page.getByRole('button', { name: 'Add passkey' }).click()
  await page.getByLabel('Passkey name').fill('E2E Passkey')
  await page.getByRole('dialog').getByRole('button', { name: 'Add passkey' }).click()
  await expect(page.getByText('Passkey enrolled.')).toBeVisible()
  await expect(page.getByText('E2E Passkey')).toBeVisible()

  await attachCoverage(testInfo, ['totp-flow', 'passkey-flow'])
})

function totp(secret: string) {
  return hotp(base32(secret), Math.floor(Date.now() / 30_000))
}

function readTotpSecret(value: string) {
  if (value.startsWith('otpauth://')) return new URL(value).searchParams.get('secret') ?? ''
  return value
}

async function waitForStableTotpWindow(page: { waitForTimeout: (timeout: number) => Promise<void> }) {
  const elapsed = Date.now() % 30_000
  if (elapsed > 25_000) await page.waitForTimeout(30_000 - elapsed + 500)
}

function hotp(key: Buffer, counter: number) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0xf
  const code = digest.readUInt32BE(offset) & 0x7fffffff
  return String(code % 1_000_000).padStart(6, '0')
}

function base32(input: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of input.replaceAll(/\s|=/g, '').toUpperCase()) {
    const value = alphabet.indexOf(char)
    if (value < 0) continue
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}
