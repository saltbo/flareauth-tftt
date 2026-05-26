import { createFileRoute } from '@tanstack/react-router'
import { OidcStartRoute } from '../-oidc'

export const Route = createFileRoute('/oidc/start')({
  component: OidcStartRoute,
})
