import { createFileRoute } from '@tanstack/react-router'
import { ApiResourcesPage } from '@/features/console/console'

export const Route = createFileRoute('/console/api-resources/')({
  component: ApiResourcesPage,
})
