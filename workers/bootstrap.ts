import { createApp } from '../server/app'
import { type Auth, createAuth } from '../server/auth'
import { createDb } from '../server/db/client'
import type { Env } from '../shared/env'

let cachedAuth: Auth | null = null

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const auth = getAuth(request, env)
    return createApp(auth).fetch(request, env, ctx)
  },
}

function getAuth(request: Request, env: Env): Auth {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not configured for this deployment.')
  }

  if (!cachedAuth) {
    const origin = new URL(request.url).origin
    const baseURL = env.BETTER_AUTH_URL || origin
    const trustedOrigins = env.TRUSTED_ORIGINS?.split(',').map((origin) => origin.trim()) || [origin]
    cachedAuth = createAuth(createDb(env.DB), env.BETTER_AUTH_SECRET, baseURL, trustedOrigins)
  }

  return cachedAuth
}
