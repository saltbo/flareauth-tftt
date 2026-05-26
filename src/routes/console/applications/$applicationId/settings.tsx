import { createFileRoute } from '@tanstack/react-router'
import { ApplicationSettingsPage } from '@/features/console/extracted/applications/application-detail-pages'

export const Route = createFileRoute('/console/applications/$applicationId/settings')({
  component: ApplicationSettingsRoute,
})

function ApplicationSettingsRoute() {
  const { applicationId } = Route.useParams()
  return <ApplicationSettingsPage applicationId={applicationId} />
}
