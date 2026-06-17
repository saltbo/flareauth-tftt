import { createFileRoute } from '@tanstack/react-router'
import { ApplicationFederatedCredentialsPage } from '@/features/console/extracted/applications/application-detail-pages'

export const Route = createFileRoute('/console/applications/$applicationId/federated-credentials')({
  component: ApplicationFederatedCredentialsRoute,
})

function ApplicationFederatedCredentialsRoute() {
  const { applicationId } = Route.useParams()
  return <ApplicationFederatedCredentialsPage applicationId={applicationId} />
}
