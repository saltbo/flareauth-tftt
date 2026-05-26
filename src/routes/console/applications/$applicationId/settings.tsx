import { createFileRoute } from '@tanstack/react-router'
import { ApplicationSettingsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/applications/$applicationId/settings')({
  component: ApplicationSettingsRoute,
})

function ApplicationSettingsRoute() {
  const { applicationId } = Route.useParams()
  return <ApplicationSettingsPage applicationId={applicationId} />
}
