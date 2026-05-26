import { createFileRoute } from '@tanstack/react-router'
import { AuthCallbackPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})
