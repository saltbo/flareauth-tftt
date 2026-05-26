import { createFileRoute } from '@tanstack/react-router'
import { UserProfilePage } from '@/features/console/extracted/users/user-detail-pages'

export const Route = createFileRoute('/console/users/$userId/profile')({
  component: UserProfileRoute,
})

function UserProfileRoute() {
  const { userId } = Route.useParams()
  return <UserProfilePage userId={userId} />
}
