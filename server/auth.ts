import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, oidcProvider } from 'better-auth/plugins'
import type { Database } from './db/client'
import * as schema from './db/schema'
import { hashPassword, verifyPassword } from './lib/password'

export function createAuth(db: Database, secret: string, baseURL: string, trustedOrigins: string[]) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(hash, password),
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    plugins: [
      admin(),
      oidcProvider({
        __skipDeprecationWarning: true,
        loginPage: '/sign-in',
        consentPage: '/oauth/consent',
        requirePKCE: true,
        allowPlainCodeChallengeMethod: false,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        defaultScope: 'openid profile email',
        storeClientSecret: 'hashed',
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
