import { createFileRoute } from '@tanstack/react-router'
import { UserLinkedAccountsPage } from '@/features/console/extracted/users/user-detail-pages'

export const Route = createFileRoute('/console/users/$userId/linked-accounts')({
  component: UserLinkedAccountsRoute,
})

function UserLinkedAccountsRoute() {
  const { userId } = Route.useParams()
  return <UserLinkedAccountsPage userId={userId} />
}
