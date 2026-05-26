import { createFileRoute } from '@tanstack/react-router'
import { MfaPage } from '@/features/console/console'

export const Route = createFileRoute('/console/mfa')({
  component: MfaPage,
})
