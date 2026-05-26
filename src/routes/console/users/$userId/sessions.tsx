import { createFileRoute } from '@tanstack/react-router'
import { UserSessionsPage } from '@/features/console/extracted/users/user-detail-pages'

export const Route = createFileRoute('/console/users/$userId/sessions')({
  component: UserSessionsRoute,
})

function UserSessionsRoute() {
  const { userId } = Route.useParams()
  return <UserSessionsPage userId={userId} />
}
