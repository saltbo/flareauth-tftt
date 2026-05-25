import type { Context } from 'hono'
import type { SecurityPolicy } from '../../../shared/api/security'
import { createDb } from '../../db/client'
import { createConnectorRepository } from '../connectors/repository'
import { loadAuthConnectorConfig } from '../connectors/service'
import type { OnboardingRepository } from '../onboarding/repository'
import { createDrizzleConfigzRepository } from './drizzle-repository'
import { ConfigzService } from './service'

export interface ConfigzBindings {
  DB: D1Database
}

export interface ConfigzRuntimeOptions {
  onboardingRepository?: OnboardingRepository
  securityPolicy?: SecurityPolicy
}

export function createConfigzService(c: Context<{ Bindings: ConfigzBindings }>, options: ConfigzRuntimeOptions = {}) {
  const url = new URL(c.req.url)
  const issuer = `${url.protocol}//${url.host}`
  return new ConfigzService(createDrizzleConfigzRepository(createDb(c.env.DB)), {
    issuer,
    emailOtpEnabled: true,
    usernameEnabled: true,
    onboardingRepository: options.onboardingRepository,
    securityPolicy: options.securityPolicy,
    availableIdentityProviderIds: async () => {
      const config = await loadAuthConnectorConfig(createConnectorRepository(createDb(c.env.DB)))
      return new Set(config.trustedProviders)
    },
  })
}
