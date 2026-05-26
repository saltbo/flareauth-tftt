import { createFileRoute } from '@tanstack/react-router'
import { SecurityBlocklistPage } from '@/features/console/extracted/security-settings'

export const Route = createFileRoute('/console/security/blocklist')({
  component: SecurityBlocklistPage,
})
