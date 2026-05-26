import { setDefaultTimeout, setWorldConstructor, type World } from '@cucumber/cucumber'
import { type Browser, type BrowserContext, chromium, type Page } from '@playwright/test'
import { createRestishHome, type RestishHome } from '../helpers/restish'

setDefaultTimeout(120_000)

export class FlareAuthWorld implements World {
  readonly attach: World['attach']
  readonly log: World['log']
  readonly link: World['link']
  readonly parameters: World['parameters']

  browser: Browser | null = null
  context: BrowserContext | null = null
  page: Page | null = null
  restishHome: RestishHome | null = null
  restishAuthorization: string | null = null
  restishAuthorizeUrl: string | null = null
  restishCallbackUrl: string | null = null
  restishApplicationId: string | null = null

  constructor(options: {
    attach: World['attach']
    log: World['log']
    link: World['link']
    parameters: World['parameters']
  }) {
    this.attach = options.attach
    this.log = options.log
    this.link = options.link
    this.parameters = options.parameters
  }

  get baseURL() {
    return process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '4189'}`
  }

  get requirePage() {
    if (!this.page) throw new Error('Scenario page has not been created.')
    return this.page
  }

  async openPage() {
    if (!this.browser) this.browser = await chromium.launch()
    this.context = await this.browser.newContext({ baseURL: this.baseURL })
    this.page = await this.context.newPage()
    return this.page
  }

  async configureRestish() {
    this.restishHome = await createRestishHome(`${this.baseURL}/api/management`)
  }
}

setWorldConstructor(FlareAuthWorld)
