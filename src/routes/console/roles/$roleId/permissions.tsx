import { createFileRoute } from '@tanstack/react-router'
import { RoleDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/roles/$roleId/permissions')({
  component: RolePermissionsRoute,
})

function RolePermissionsRoute() {
  const { roleId } = Route.useParams()
  return <RoleDetailPage roleId={roleId} section="permissions" />
}
