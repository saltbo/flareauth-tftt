import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/console/console'

export const Route = createFileRoute('/console/roles/')({
  component: RolesPage,
})
