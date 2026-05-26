import { createFileRoute } from '@tanstack/react-router'
import { SecurityBlocklistPage } from '@/features/console/console'

export const Route = createFileRoute('/console/security/blocklist')({
  component: SecurityBlocklistPage,
})
