import { expect, test } from '@playwright/test'
import { privateKeyToAccount } from 'viem/accounts'
import { attachCoverage, resetAndBootstrap, signIn, signOut, walletAddressRows } from './helpers/real-app'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetAndBootstrap()
})

test('Web3 wallet sign-in follows the real hosted SIWE flow with an external wallet boundary', async ({
  page,
}, testInfo) => {
  await signIn(page)
  const settings = await page.request.patch('/api/management/sign-in-settings', {
    data: {
      builtInProviders: {
        web3Wallet: {
          enabled: true,
          chains: [1],
          anonymous: true,
          domain: '',
          emailDomainName: '',
          ensLookupEnabled: false,
        },
      },
    },
  })
  expect(settings.status(), await settings.text()).toBe(200)
  await signOut(page)

  await page.goto('/sign-in')
  await expect(page.getByRole('button', { name: 'Continue with Web3 wallet' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue with Web3 wallet' }).click()
  await expect(page.getByRole('alert')).toContainText('No wallet provider was found')

  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
  await page.exposeFunction('signWalletMessage', (message: string) => account.signMessage({ message }))
  await page.addInitScript((address) => {
    const walletWindow = window as typeof window & {
      ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      signWalletMessage: (message: string) => Promise<string>
    }
    walletWindow.ethereum = {
      request: async ({ method, params }) => {
        if (method === 'eth_requestAccounts') return [address]
        if (method === 'eth_chainId') return '0x1'
        if (method === 'personal_sign') return walletWindow.signWalletMessage(String(params?.[0]))
        throw new Error(`Unsupported wallet method ${method}`)
      },
    }
  }, account.address)
  await page.reload()
  await page.getByRole('button', { name: 'Continue with Web3 wallet' }).click()
  await page.waitForURL('**/profile')
  await expect(page.getByRole('heading', { name: account.address })).toBeVisible()

  expect(walletAddressRows(account.address)).toEqual([
    expect.objectContaining({
      address: account.address,
      chain_id: 1,
      is_primary: 1,
    }),
  ])

  await attachCoverage(testInfo, ['web3-wallet-sign-in'])
})
