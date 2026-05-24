import { expect, test } from '@playwright/test'
import { admin, attachCoverage, baseURL, resetAndBootstrap } from './helpers/real-app'
import { createRestishHome, removeRestishHome, restish, restishInstalled, startRestishAuthHeader } from './helpers/restish'

test.describe.configure({ mode: 'serial' })

test.skip(!(await restishInstalled()), 'restish CLI is required for Management CLI E2E')

test('Restish OAuth token can manage applications through the Management API', async ({ page }, testInfo) => {
  test.setTimeout(60_000)

  await resetAndBootstrap()

  const restishHome = await createRestishHome(`${baseURL}/api/management`)
  try {
    await restish(['api', 'sync', 'flareauth-local'], restishHome)

    const auth = await startRestishAuthHeader(restishHome)
    expect(new URL(auth.authorizeUrl).searchParams.get('client_id')).toBe('flareauth-cli')
    await page.goto(auth.authorizeUrl)
    await page.getByRole('textbox', { name: 'Email or username' }).fill(admin.username)
    await page.getByRole('textbox', { name: 'Password' }).fill(admin.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Review application access.' })).toBeVisible()
    await expect(page.getByText('FlareAuth CLI')).toBeVisible()
    await page.getByRole('button', { name: 'Approve access' }).click()

    const authorization = await auth.authHeader()
    const headers = ['-H', `Authorization: ${authorization}`, '-H', 'Content-Type: application/json']
    const appSlug = `restish-e2e-${Date.now()}`

    const created = JSON.parse(
      await restish(
        ['flareauth-local', 'create-application', ...headers, '-o', 'json'],
        restishHome,
        {
          name: 'Restish E2E Application',
          slug: appSlug,
          clientType: 'public_spa',
          redirectUris: [`${baseURL}/oidc/callback`],
          firstParty: true,
          trusted: true,
        },
      ),
    )
    expect(created).toMatchObject({ slug: appSlug, name: 'Restish E2E Application' })

    const updated = JSON.parse(
      await restish(
        ['flareauth-local', 'update-application', created.id, ...headers, '-o', 'json'],
        restishHome,
        { name: 'Restish E2E Application Updated' },
      ),
    )
    expect(updated).toMatchObject({ id: created.id, name: 'Restish E2E Application Updated' })

    const listed = JSON.parse(
      await restish(
        ['flareauth-local', 'list-applications', '-H', `Authorization: ${authorization}`, '-o', 'json'],
        restishHome,
      ),
    )
    expect(listed.applications).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]))

    await restish(
      ['flareauth-local', 'delete-application', created.id, '-H', `Authorization: ${authorization}`],
      restishHome,
    )

    const deleted = await page.request.get(`/api/management/applications/${created.id}`)
    expect(deleted.status()).toBe(404)

    const readiness = JSON.parse(
      await restish(['flareauth-local', 'get-readiness', '-H', `Authorization: ${authorization}`, '-o', 'json'], restishHome),
    )
    expect(readiness.admin).toEqual(expect.objectContaining({ setupRequired: expect.any(Boolean) }))

    const signInSettings = JSON.parse(
      await restish(
        ['flareauth-local', 'get-sign-in-settings', '-H', `Authorization: ${authorization}`, '-o', 'json'],
        restishHome,
      ),
    )
    expect(signInSettings.signIn).toEqual(expect.any(Object))

    const connectorSlug = `${appSlug}-connector`
    const createdConnector = JSON.parse(
      await restish(
        ['flareauth-local', 'create-connector', ...headers, '-o', 'json'],
        restishHome,
        {
          slug: connectorSlug,
          providerType: 'generic_oauth',
          providerId: 'restish-e2e',
          displayName: 'Restish E2E Connector',
          enabled: false,
        },
      ),
    )
    expect(createdConnector).toMatchObject({ slug: connectorSlug, displayName: 'Restish E2E Connector' })

    await restish(
      ['flareauth-local', 'delete-connector', createdConnector.id, '-H', `Authorization: ${authorization}`],
      restishHome,
    )
    const deletedConnector = await page.request.get(`/api/management/connectors/${createdConnector.id}`)
    expect(deletedConnector.status()).toBe(404)

    await attachCoverage(testInfo, ['management-restish-oauth-crud'])
  } finally {
    await removeRestishHome(restishHome)
  }
})
