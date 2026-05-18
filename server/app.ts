import { Hono } from 'hono'
import type { Auth } from './auth'

type AuthHandler = Pick<Auth, 'handler'>

export function createApp(auth: AuthHandler) {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      service: 'flareauth',
    }),
  )

  app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw))

  return app
}

export type AppType = ReturnType<typeof createApp>
