import { createFileRoute } from '@tanstack/react-router'
import { OrganizationDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/organizations/$organizationId/authorization')({
  component: OrganizationAuthorizationRoute,
})

function OrganizationAuthorizationRoute() {
  const { organizationId } = Route.useParams()
  return <OrganizationDetailPage organizationId={organizationId} section="authorization" />
}
