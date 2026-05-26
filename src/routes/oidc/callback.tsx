import { createFileRoute } from '@tanstack/react-router'
import { OidcCallbackRoute } from '../-oidc'

export const Route = createFileRoute('/oidc/callback')({
  component: OidcCallbackRoute,
})
