import { createFileRoute } from '@tanstack/react-router'
import { SecurityGeneralPage } from '@/features/console/console'

export const Route = createFileRoute('/console/security/general')({
  component: SecurityGeneralPage,
})
