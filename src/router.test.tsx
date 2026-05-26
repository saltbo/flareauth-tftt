import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRouter, queryClient } from '@/router'

vi.mock('@/features/account/account-center', () => ({
  AccountConnectionsPage: () => <h1>Profile route</h1>,
  AccountProfilePage: () => <h1>Profile route</h1>,
  AccountSecurityPage: () => <h1>Profile route</h1>,
}))

vi.mock('@/features/agents/agent-approval', () => ({
  AgentApproval: () => <h1>Agent approval route</h1>,
}))

vi.mock('@/features/auth/onboarding-page', () => ({
  OnboardingRoute: () => <h1>First-admin onboarding</h1>,
}))

vi.mock('@/features/auth/pages/recovery', () => ({
  AuthCallbackPage: () => <h1>Auth callback route</h1>,
  EmailVerificationPage: () => <h1>Email verification route</h1>,
  ForgotPasswordPage: () => <h1>Forgot password route</h1>,
}))

vi.mock('@/features/auth/pages/sign-in', () => ({
  SignInPage: () => <h1>Sign in route</h1>,
}))

vi.mock('@/features/auth/pages/sign-up', () => ({
  SignUpPage: () => <h1>Sign up route</h1>,
}))

afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.restoreAllMocks()
  window.history.pushState(null, '', '/')
})

describe('root route', () => {
  it('redirects signed-in root visits to the profile entry point', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(jsonResponse({ user })))

    render(<AppRouter />)

    expect(await screen.findByRole('heading', { name: 'Profile route' })).toBeTruthy()
    await waitFor(() => expect(window.location.pathname).toBe('/profile'))
    expect(fetchSpy).toHaveBeenCalledWith('/api/account/profile', {
      body: undefined,
      headers: expect.any(Headers),
      method: 'GET',
    })
  })

  it('authenticates profile routes before rendering them', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(jsonResponse({ user })))
    window.history.pushState(null, '', '/profile')

    render(<AppRouter />)

    expect(await screen.findByRole('heading', { name: 'Profile route' })).toBeTruthy()
    expect(window.location.pathname).toBe('/profile')
    expect(fetchSpy).toHaveBeenCalledWith('/api/account/profile', {
      body: undefined,
      headers: expect.any(Headers),
      method: 'GET',
    })
  })

  it('authenticates AgentAuth approval before rendering it', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => Promise.resolve(jsonResponse({ user })))
    window.history.pushState(null, '', '/agent/approve?agent_id=agent-1&code=ABCD-1234')

    render(<AppRouter />)

    expect(await screen.findByRole('heading', { name: 'Agent approval route' })).toBeTruthy()
    expect(fetchSpy).toHaveBeenCalledWith('/api/account/profile', {
      body: undefined,
      headers: expect.any(Headers),
      method: 'GET',
    })
  })

  it('serves hosted auth from /auth routes only', async () => {
    window.history.pushState(null, '', '/auth/sign-in')
    render(<AppRouter />)

    expect(await screen.findByRole('heading', { name: 'Sign in route' })).toBeTruthy()

    cleanup()
    window.history.pushState(null, '', '/sign-in')
    render(<AppRouter />)

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sign in route' })).toBeNull())
    expect(document.body.textContent).toContain('Not Found')
  })
})

const user = {
  id: 'user-1',
  email: 'jane@example.com',
  name: 'Jane Stone',
  displayName: 'Jane Stone',
  username: 'jane',
  role: 'user',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
