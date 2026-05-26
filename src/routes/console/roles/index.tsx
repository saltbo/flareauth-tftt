import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/console/extracted/roles'

export const Route = createFileRoute('/console/roles/')({
  component: RolesPage,
})
