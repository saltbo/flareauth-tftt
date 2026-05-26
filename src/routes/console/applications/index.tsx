import { createFileRoute } from '@tanstack/react-router'
import { ApplicationsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/applications/')({
  component: ApplicationsRoute,
})

function ApplicationsRoute() {
  return <ApplicationsPage />
}
