import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/console/console'

export const Route = createFileRoute('/console/users/')({
  component: UsersPage,
})
