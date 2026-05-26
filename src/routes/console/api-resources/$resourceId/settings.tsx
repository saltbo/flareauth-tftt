import { createFileRoute } from '@tanstack/react-router'
import { ApiResourceDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/api-resources/$resourceId/settings')({
  component: ApiResourceSettingsRoute,
})

function ApiResourceSettingsRoute() {
  const { resourceId } = Route.useParams()
  return <ApiResourceDetailPage resourceId={resourceId} section="settings" />
}
