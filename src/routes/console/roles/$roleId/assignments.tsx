import { createFileRoute } from '@tanstack/react-router'
import { RoleDetailPage } from '@/features/console/console'

export const Route = createFileRoute('/console/roles/$roleId/assignments')({
  component: RoleAssignmentsRoute,
})

function RoleAssignmentsRoute() {
  const { roleId } = Route.useParams()
  return <RoleDetailPage roleId={roleId} section="assignments" />
}
