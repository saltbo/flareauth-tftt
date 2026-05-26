import { createFileRoute } from '@tanstack/react-router'
import { OrganizationDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/organizations/$organizationId/settings')({
  component: OrganizationSettingsRoute,
})

function OrganizationSettingsRoute() {
  const { organizationId } = Route.useParams()
  return <OrganizationDetailPage organizationId={organizationId} section="settings" />
}
