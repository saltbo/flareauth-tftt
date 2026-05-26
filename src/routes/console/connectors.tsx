import { createFileRoute } from '@tanstack/react-router'
import { ConnectorsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/connectors')({
  component: ConnectorsPage,
})
