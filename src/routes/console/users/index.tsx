import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/console/extracted/users/users-list'

export const Route = createFileRoute('/console/users/')({
  component: UsersPage,
})
