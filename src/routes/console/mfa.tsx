import { createFileRoute } from '@tanstack/react-router'
import { MfaPage } from '@/features/console/extracted/security-settings'

export const Route = createFileRoute('/console/mfa')({
  component: MfaPage,
})
