import { createFileRoute } from '@tanstack/react-router'
import { OidcStartRoute } from '@/features/auth/oidc-client-pages'

export const Route = createFileRoute('/oidc/start')({
  component: OidcStartRoute,
})
