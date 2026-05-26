import { createFileRoute } from '@tanstack/react-router'
import { ConsoleDashboardPage } from '@/features/console/pages/dashboard-page'

export const Route = createFileRoute('/console/')({
  component: ConsoleIndexRoute,
})

function ConsoleIndexRoute() {
  return <ConsoleDashboardPage />
}
