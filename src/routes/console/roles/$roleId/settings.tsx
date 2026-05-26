import { createFileRoute } from '@tanstack/react-router'
import { RoleDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/roles/$roleId/settings')({
  component: RoleSettingsRoute,
})

function RoleSettingsRoute() {
  const { roleId } = Route.useParams()
  return <RoleDetailPage roleId={roleId} section="settings" />
}
