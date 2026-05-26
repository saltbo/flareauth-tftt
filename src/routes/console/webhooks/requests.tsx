import { createFileRoute } from '@tanstack/react-router'
import { WebhooksPage } from '@/features/console/extracted/deployment-misc/webhooks'

export const Route = createFileRoute('/console/webhooks/requests')({
  component: () => <WebhooksPage section="requests" />,
})
