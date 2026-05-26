import { createFileRoute } from '@tanstack/react-router'
import { ApplicationBrandingPage } from '@/features/console/console'

export const Route = createFileRoute('/console/applications/$applicationId/branding')({
  component: ApplicationBrandingRoute,
})

function ApplicationBrandingRoute() {
  const { applicationId } = Route.useParams()
  return <ApplicationBrandingPage applicationId={applicationId} />
}
