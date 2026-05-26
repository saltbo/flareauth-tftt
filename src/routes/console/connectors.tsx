import { createFileRoute } from '@tanstack/react-router'
import { ConnectorsPage } from '@/features/console/extracted/connectors'

export const Route = createFileRoute('/console/connectors')({
  component: ConnectorsPage,
})
