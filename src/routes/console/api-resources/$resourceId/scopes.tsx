import { createFileRoute } from '@tanstack/react-router'
import { ApiResourceDetailPage } from '@/features/console/extracted/api-resources'

export const Route = createFileRoute('/console/api-resources/$resourceId/scopes')({
  component: ApiResourceScopesRoute,
})

function ApiResourceScopesRoute() {
  const { resourceId } = Route.useParams()
  return <ApiResourceDetailPage resourceId={resourceId} section="scopes" />
}
