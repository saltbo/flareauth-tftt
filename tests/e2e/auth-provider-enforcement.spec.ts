import { expect, test } from '@playwright/test'
import { attachCoverage, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('disabled hosted auth providers block their native auth endpoints', async ({ page }, testInfo) => {
  await signIn(page)
  const settings = await page.request.get('/api/management/sign-in-settings').then((response) => response.json())
  const security = await page.request.get('/api/management/security/policy').then((response) => response.json())

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: false } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: { socialLoginEnabled: false },
      builtInProviders: {
        phone: { ...settings.builtInProviders.phone, enabled: false },
        oneTap: { ...settings.builtInProviders.oneTap, enabled: false },
        web3Wallet: { ...settings.builtInProviders.web3Wallet, enabled: false },
      },
    },
  })

  const phoneSend = await page.request.post('/api/auth/phone-number/send-otp', {
    data: { phoneNumber: '+15555550123' },
  })
  expect(phoneSend.status()).toBe(404)

  const phoneVerify = await page.request.post('/api/auth/phone-number/verify', {
    data: { phoneNumber: '+15555550123', code: '123456' },
  })
  expect(phoneVerify.status()).toBe(404)

  const oneTap = await page.request.post('/api/auth/one-tap/callback', {
    data: { idToken: 'fake-token' },
  })
  expect(oneTap.status()).toBe(404)

  const web3Nonce = await page.request.post('/api/auth/siwe/nonce', {
    data: { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
  })
  expect(web3Nonce.status()).toBe(403)
  await expect(web3Nonce.json()).resolves.toMatchObject({
    error: { message: 'Web3 wallet authentication is disabled.' },
  })

  const passkey = await page.request.post('/api/auth/passkey/generate-authenticate-options', {
    data: {},
  })
  expect(passkey.status()).toBe(404)

  const social = await page.request.post('/api/auth/sign-in/social', {
    data: { provider: 'github', callbackURL: '/profile' },
  })
  expect(social.status()).toBe(403)
  await expect(social.json()).resolves.toMatchObject({
    error: { message: 'Social authentication is disabled.' },
  })

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { passkeys: { enabled: security.policy.passkeys.enabled } } },
  })
  await page.request.patch('/api/management/sign-in-settings', {
    data: {
      signIn: { socialLoginEnabled: settings.signIn.socialLoginEnabled },
      builtInProviders: {
        phone: settings.builtInProviders.phone,
        oneTap: settings.builtInProviders.oneTap,
        web3Wallet: settings.builtInProviders.web3Wallet,
      },
    },
  })

  await attachCoverage(testInfo, [
    'provider-disabled-endpoint-enforcement',
    'phone-sign-in',
    'onetap-flow',
    'web3-wallet-sign-in',
    'passkey-sign-in',
    'social-login',
  ])
})
