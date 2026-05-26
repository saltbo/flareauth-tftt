import { createFileRoute } from '@tanstack/react-router'
import { SecurityGeneralPage } from '@/features/console/extracted/security-settings'

export const Route = createFileRoute('/console/security/general')({
  component: SecurityGeneralPage,
})
