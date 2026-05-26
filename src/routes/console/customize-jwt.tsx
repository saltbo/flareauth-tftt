import { createFileRoute } from '@tanstack/react-router'
import { CustomizeJwtPage } from '@/features/console/console'

export const Route = createFileRoute('/console/customize-jwt')({
  component: CustomizeJwtPage,
})
