import { createFileRoute } from '@tanstack/react-router'
import { OrganizationsPage } from '@/features/console/extracted/organizations'

export const Route = createFileRoute('/console/organizations/')({
  component: OrganizationsPage,
})
