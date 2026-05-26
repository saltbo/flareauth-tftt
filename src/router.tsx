import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider, redirect } from '@tanstack/react-router'
import { ConsoleShell } from '@/components/layout/console-shell'
import { Toaster } from '@/components/ui/sonner'
import { ConsoleDashboardPage, ConsoleOnboardingPage } from '@/features/console/console'
import { AccountConnectionsRoute, AccountProfileRoute, AccountSecurityRoute } from '@/routes/account'
import { AgentApproveRoute } from '@/routes/agent-approve'
import { AuthCallbackRoute } from '@/routes/auth-callback'
import { EmailVerificationRoute } from '@/routes/email-verification'
import { ForgotPasswordRoute } from '@/routes/forgot-password'
import { OAuthConsentRoute } from '@/routes/oauth/consent'
import { OidcCallbackRoute, OidcStartRoute } from '@/routes/oidc-callback'
import { OnboardingRoute } from '@/routes/onboarding'
import { SignInRoute } from '@/routes/sign-in'
import { SignUpRoute } from '@/routes/sign-up'
import { createConsoleRoutes } from './routes/console-routes'

export const queryClient = new QueryClient()

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

type RouteAccountProfile = {
  user?: {
    role?: string | null
  }
}

async function loadAccountProfile() {
  const response = await fetch('/api/account/profile', { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return (await response.json()) as RouteAccountProfile
}

async function requireAccountProfile(locationHref: string) {
  const profile = await loadAccountProfile()
  if (!profile) throw redirect({ href: `/sign-in?return_to=${encodeURIComponent(locationHref)}` })
  return profile
}

async function readErrorMessage(response: Response) {
  const text = await response.text()
  if (!text) return response.statusText
  try {
    const body = JSON.parse(text) as { error?: string | { message?: string } }
    if (typeof body.error === 'string') return body.error
    if (body.error?.message) return body.error.message
  } catch {
    return text
  }
  return text
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const profile = await loadAccountProfile()
    if (!profile) throw redirect({ to: '/sign-in' })
    throw redirect({ to: '/profile' })
  },
})

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInRoute,
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpRoute,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordRoute,
})

const emailVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/email-verification',
  component: EmailVerificationRoute,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackRoute,
})

const oauthConsentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oauth/consent',
  component: OAuthConsentRoute,
})

const agentApproveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agent/approve',
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AgentApproveRoute,
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingRoute,
})

const oidcCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oidc/callback',
  component: OidcCallbackRoute,
})

const oidcStartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oidc/start',
  component: OidcStartRoute,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AccountProfileRoute,
})

const securityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/security',
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AccountSecurityRoute,
})

const connectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/connections',
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AccountConnectionsRoute,
})

const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/console',
  beforeLoad: async ({ location }) => {
    const profile = await requireAccountProfile(location.href)
    if (profile.user?.role !== 'admin') throw redirect({ href: '/profile' })
  },
  component: () => (
    <ConsoleShell>
      <Outlet />
    </ConsoleShell>
  ),
})

const consoleIndexRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/',
  component: ConsoleDashboardPage,
})

const consoleDashboardRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: 'dashboard',
  component: ConsoleDashboardPage,
})

const consoleOnboardingRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/onboarding',
  component: ConsoleOnboardingPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  oidcStartRoute,
  oidcCallbackRoute,
  signInRoute,
  signUpRoute,
  forgotPasswordRoute,
  emailVerificationRoute,
  authCallbackRoute,
  oauthConsentRoute,
  agentApproveRoute,
  profileRoute,
  securityRoute,
  connectionsRoute,
  consoleRoute.addChildren([
    consoleIndexRoute,
    consoleDashboardRoute,
    ...createConsoleRoutes(consoleRoute),
    consoleOnboardingRoute,
  ]),
])

export const router = createRouter({ routeTree })

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
