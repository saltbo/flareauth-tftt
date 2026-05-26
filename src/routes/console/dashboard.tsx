import { createFileRoute } from '@tanstack/react-router'
import { ConsoleDashboardPage } from '@/features/console/pages/dashboard-page'

export const Route = createFileRoute('/console/dashboard')({
  component: ConsoleDashboardRoute,
})

function ConsoleDashboardRoute() {
  return <ConsoleDashboardPage />
}
