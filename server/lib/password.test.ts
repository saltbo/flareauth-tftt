import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery staple')

    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'incorrect')).resolves.toBe(false)
  })
})
