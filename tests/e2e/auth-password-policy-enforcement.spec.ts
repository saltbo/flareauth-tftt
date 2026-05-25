import { expect, test } from '@playwright/test'
import { attachCoverage, baseURL, resetAndBootstrap, signIn } from './helpers/real-app'

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('native password change enforces the managed password policy', async ({ browser, page }, testInfo) => {
  await signIn(page)
  const security = await page.request.get('/api/management/security/policy').then((response) => response.json())
  const originalPasswordPolicy = security.policy.password

  await page.request.patch('/api/management/security/policy', {
    data: {
      policy: {
        password: {
          ...originalPasswordPolicy,
          minLength: 12,
          requiredCharacterTypes: 3,
          rejectSequential: true,
        },
      },
    },
  })

  const stamp = Date.now()
  const email = `native-policy-${stamp}@example.com`
  const initialPassword = 'Zr9!Native#2026'
  const created = await page.request.post('/api/management/users', {
    data: {
      email,
      username: `nativepolicy${stamp}`,
      displayName: 'Native Policy',
      password: initialPassword,
      role: 'user',
    },
  })
  expect(created.status(), await created.text()).toBe(201)

  const userContext = await browser.newContext({ baseURL })
  const login = await userContext.request.post('/api/auth/sign-in/email', {
    headers: { Origin: baseURL },
    data: { email, password: initialPassword },
  })
  expect(login.status(), await login.text()).toBe(200)

  const weakChange = await userContext.request.post('/api/auth/change-password', {
    headers: { Origin: baseURL },
    data: { currentPassword: initialPassword, newPassword: 'Abcd1!xyZ0' },
  })
  expect(weakChange.status()).toBe(400)
  await expect(weakChange.json()).resolves.toMatchObject({
    error: { message: 'Password must be at least 12 characters.' },
  })

  const strongChange = await userContext.request.post('/api/auth/change-password', {
    headers: { Origin: baseURL },
    data: { currentPassword: initialPassword, newPassword: 'Zr9!Native#2027' },
  })
  expect(strongChange.status(), await strongChange.text()).toBe(200)
  await userContext.close()

  await page.request.patch('/api/management/security/policy', {
    data: { policy: { password: originalPasswordPolicy } },
  })

  await attachCoverage(testInfo, ['password-policy-native-change'])
})
