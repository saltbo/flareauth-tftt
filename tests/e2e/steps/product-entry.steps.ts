import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { admin, resetAndBootstrap, signIn } from '../helpers/real-app'
import type { FlareAuthWorld } from '../support/world'

Given('I am signed out', async function (this: FlareAuthWorld) {
  await resetAndBootstrap()
  await this.context?.clearCookies()
})

Given('I am signed in', async function (this: FlareAuthWorld) {
  await resetAndBootstrap()
  await signIn(this.requirePage)
})

Given('password sign-in is enabled', async function (this: FlareAuthWorld) {
  const response = await this.requirePage.request.get('/api/configz')
  assert.equal(response.status(), 200, await response.text())
  const body = (await response.json()) as { signIn?: { passwordEnabled?: boolean } }
  assert.equal(body.signIn?.passwordEnabled, true)
})

When('I open a hosted auth route', async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/auth/sign-in')
})

When('I submit the onboarding form with admin profile and password details', async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/onboarding')
  await submitOnboarding(this.requirePage)
})

When(/^I open \/$/, async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/')
})

When(/^I open \/profile$/, async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/profile')
})

When(/^I submit valid credentials on \/auth\/sign-in$/, async function (this: FlareAuthWorld) {
  await signIn(this.requirePage)
})

Then(/^I am redirected to \/onboarding$/, async function (this: FlareAuthWorld) {
  await expect(this.requirePage).toHaveURL(/\/onboarding$/)
})

Then('the first admin user is created', async function (this: FlareAuthWorld) {
  await expect(this.requirePage.getByText('First admin created. Sign in to finish Console setup.')).toBeVisible()
})

Then('the page confirms that Console setup can continue from sign-in', async function (this: FlareAuthWorld) {
  await expect(this.requirePage.getByText('First admin created. Sign in to finish Console setup.')).toBeVisible()
})

Then(/^I am redirected to \/auth\/sign-in$/, async function (this: FlareAuthWorld) {
  await expect(this.requirePage).toHaveURL(/\/auth\/sign-in/)
})

Then(/^the return_to query parameter is \/profile$/, async function (this: FlareAuthWorld) {
  assert.equal(new URL(this.requirePage.url()).searchParams.get('return_to'), '/profile')
})

Then(/^I am redirected to \/profile$/, async function (this: FlareAuthWorld) {
  await expect(this.requirePage).toHaveURL(/\/profile$/)
})

Then('I am authenticated', async function (this: FlareAuthWorld) {
  await expect(this.requirePage).toHaveURL(/\/profile$/)
})

Then('I land in Account Center', async function (this: FlareAuthWorld) {
  await expect(this.requirePage.getByRole('heading', { name: admin.name })).toBeVisible()
})

Then('I see the account navigation and the single Profile settings card', async function (this: FlareAuthWorld) {
  await expect(this.requirePage.getByRole('navigation', { name: 'Account center' })).toBeVisible()
  await expect(this.requirePage.getByRole('heading', { name: admin.name })).toBeVisible()
})

When('the first admin completes onboarding from the hosted sign-in entry', async function (this: FlareAuthWorld) {
  const page = this.requirePage
  await page.goto('/auth/sign-in')
  await expect(page).toHaveURL(/\/onboarding$/)
  await submitOnboarding(page)
})

When('the admin signs in through hosted auth', async function (this: FlareAuthWorld) {
  await signIn(this.requirePage)
})

When('a signed-out visitor opens the product root', async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/')
})

When('the signed-out visitor opens the Account Center profile route', async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/profile')
})

When('the signed-in admin opens the product root', async function (this: FlareAuthWorld) {
  await this.requirePage.goto('/')
})

Then('hosted sign-in is shown', async function (this: FlareAuthWorld) {
  await expect(this.requirePage).toHaveURL(/\/auth\/sign-in/)
})

Then('hosted sign-in is shown with a profile return target', async function (this: FlareAuthWorld) {
  const page = this.requirePage
  await expect(page).toHaveURL(/\/auth\/sign-in/)
  assert.equal(new URL(page.url()).searchParams.get('return_to'), '/profile')
})

Then('the Account Center profile page is visible', async function (this: FlareAuthWorld) {
  const page = this.requirePage
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: admin.name })).toBeVisible()
})

async function submitOnboarding(page: FlareAuthWorld['requirePage']) {
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(admin.name)
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Username').fill(admin.username)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Create first admin' }).click()
  await expect(page.getByText('First admin created. Sign in to finish Console setup.')).toBeVisible()
}
