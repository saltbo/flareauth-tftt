import { createFileRoute } from '@tanstack/react-router'
import { AuthCallbackPage } from '@/features/auth/pages/recovery'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})
