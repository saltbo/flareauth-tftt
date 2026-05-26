import { createFileRoute } from '@tanstack/react-router'
import { UserApplicationsPage } from '@/features/console/extracted/users/user-detail-pages'

export const Route = createFileRoute('/console/users/$userId/applications')({
  component: UserApplicationsRoute,
})

function UserApplicationsRoute() {
  const { userId } = Route.useParams()
  return <UserApplicationsPage userId={userId} />
}
