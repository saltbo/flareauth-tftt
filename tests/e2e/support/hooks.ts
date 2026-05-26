import { After, Before } from '@cucumber/cucumber'
import { removeRestishHome, restishInstalled } from '../helpers/restish'
import type { FlareAuthWorld } from './world'

Before(async function (this: FlareAuthWorld) {
  await this.openPage()
})

Before({ tags: '@entrypoint:restish' }, async () => {
  if (!(await restishInstalled())) return 'skipped'
})

After(async function (this: FlareAuthWorld) {
  await removeRestishHome(this.restishHome)
  await this.context?.close()
  await this.browser?.close()
})
