import { createFileRoute } from '@tanstack/react-router'
import { OrganizationsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/organizations/')({
  component: OrganizationsPage,
})
