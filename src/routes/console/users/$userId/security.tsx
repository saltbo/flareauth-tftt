import { createFileRoute } from '@tanstack/react-router'
import { UserSecurityPage } from '@/features/console/console'

export const Route = createFileRoute('/console/users/$userId/security')({
  component: UserSecurityRoute,
})

function UserSecurityRoute() {
  const { userId } = Route.useParams()
  return <UserSecurityPage userId={userId} />
}
