import { createFileRoute } from '@tanstack/react-router'
import { ApiResourcesPage } from '@/features/console/extracted/api-resources'

export const Route = createFileRoute('/console/api-resources/')({
  component: ApiResourcesPage,
})
