import { createFileRoute } from '@tanstack/react-router'
import { UserOperationsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/users/$userId/operations')({
  component: UserOperationsRoute,
})

function UserOperationsRoute() {
  const { userId } = Route.useParams()
  return <UserOperationsPage userId={userId} />
}
