import { createFileRoute } from '@tanstack/react-router'
import { RoleDetailPage } from '@/features/console/extracted/roles'

export const Route = createFileRoute('/console/roles/$roleId/settings')({
  component: RoleSettingsRoute,
})

function RoleSettingsRoute() {
  const { roleId } = Route.useParams()
  return <RoleDetailPage roleId={roleId} section="settings" />
}
