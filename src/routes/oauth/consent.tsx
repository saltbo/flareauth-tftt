import { createFileRoute } from '@tanstack/react-router'
import { ConsentPage } from '@/features/auth/consent-page'

export const Route = createFileRoute('/oauth/consent')({
  component: ConsentPage,
})
