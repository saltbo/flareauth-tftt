import { createFileRoute } from '@tanstack/react-router'
import { ApiResourceDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/api-resources/$resourceId/permissions')({
  component: ApiResourcePermissionsRoute,
})

function ApiResourcePermissionsRoute() {
  const { resourceId } = Route.useParams()
  return <ApiResourceDetailPage resourceId={resourceId} section="permissions" />
}
