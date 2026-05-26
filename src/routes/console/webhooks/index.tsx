import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/console/webhooks/')({
  beforeLoad: () => {
    throw redirect({ href: '/console/webhooks/endpoints' })
  },
})
