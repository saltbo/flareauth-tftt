import { createFileRoute } from '@tanstack/react-router'
import { WebhooksPage } from '@/features/console/console'

export const Route = createFileRoute('/console/webhooks/endpoints')({
  component: () => <WebhooksPage section="endpoints" />,
})
