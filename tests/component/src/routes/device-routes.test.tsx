import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route as DeviceRoute } from '@/routes/device'
import { Route as DeviceApprovalRoute } from '@/routes/device/approve'

vi.mock('../../../../src/components/layout/auth-layout', () => ({
  AuthLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))

vi.mock('../../../../src/features/auth/device-authorization', () => ({
  DeviceVerification: ({ mode, userCode }: { mode: string; userCode?: string }) => (
    <div data-mode={mode}>Device verification {userCode}</div>
  ),
}))

vi.mock('../../../../src/features/auth/hooks', () => ({
  useConfigz: () => ({ data: null }),
}))

vi.mock('../../../../src/lib/route-auth', () => ({
  requireAccountProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.pushState(null, '', '/')
})

describe('device routes', () => {
  it('renders the unauthenticated device entry route with the query user code', () => {
    window.history.pushState(null, '', '/device?user_code=ABCD-1234')
    const Component = DeviceRoute.options.component!

    render(<Component />)

    expect(screen.getByRole('heading', { name: 'Device login' })).toBeTruthy()
    expect(screen.getByText('Device verification ABCD-1234').getAttribute('data-mode')).toBe('entry')
  })

  it('renders the device entry route without a query user code', () => {
    window.history.pushState(null, '', '/device')
    const Component = DeviceRoute.options.component!

    render(<Component />)

    expect(screen.getByText('Device verification').getAttribute('data-mode')).toBe('entry')
  })

  it('renders the authenticated device approval route with the query user code', () => {
    window.history.pushState(null, '', '/device/approve?user_code=ABCD-1234')
    const Component = DeviceApprovalRoute.options.component!

    render(<Component />)

    expect(screen.getByRole('heading', { name: 'Approve device' })).toBeTruthy()
    expect(screen.getByText('Device verification ABCD-1234').getAttribute('data-mode')).toBe('approval')
  })

  it('renders the authenticated device approval route without a query user code', () => {
    window.history.pushState(null, '', '/device/approve')
    const Component = DeviceApprovalRoute.options.component!

    render(<Component />)

    expect(screen.getByText('Device verification').getAttribute('data-mode')).toBe('approval')
  })

  it('requires an account profile before approving a device code', async () => {
    const { requireAccountProfile } = await import('../../../../src/lib/route-auth')

    await DeviceApprovalRoute.options.beforeLoad?.({
      location: { href: 'https://auth.example.com/device/approve?user_code=ABCD-1234' },
    } as never)

    expect(requireAccountProfile).toHaveBeenCalledWith('https://auth.example.com/device/approve?user_code=ABCD-1234')
  })
})
