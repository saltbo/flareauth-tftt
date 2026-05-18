import { describe, expect, it } from 'vitest'
import { createApp } from './app'

describe('createApp', () => {
  it('serves health status', async () => {
    const auth = {
      handler: async () => new Response(null, { status: 204 }),
    }
    const response = await createApp(auth).request('/api/health')

    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: 'flareauth',
    })
  })
})
