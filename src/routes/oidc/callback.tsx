import { createFileRoute } from '@tanstack/react-router'
import { OidcCallbackRoute } from '@/features/auth/oidc-client-pages'

export const Route = createFileRoute('/oidc/callback')({
  component: OidcCallbackRoute,
})
