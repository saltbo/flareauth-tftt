import { createFileRoute } from '@tanstack/react-router'
import { ApplicationsPage } from '@/features/console/extracted/applications/applications-list'

export const Route = createFileRoute('/console/applications/')({
  component: ApplicationsRoute,
})

function ApplicationsRoute() {
  return <ApplicationsPage />
}
