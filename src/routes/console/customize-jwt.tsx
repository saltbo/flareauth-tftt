import { createFileRoute } from '@tanstack/react-router'
import { CustomizeJwtPage } from '@/features/console/extracted/deployment-misc/misc'

export const Route = createFileRoute('/console/customize-jwt')({
  component: CustomizeJwtPage,
})
