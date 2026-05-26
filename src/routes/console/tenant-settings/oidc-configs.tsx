import { createFileRoute } from '@tanstack/react-router'
import { DeploymentSettingsPage } from '@/features/console/extracted/deployment-misc/deployment'

export const Route = createFileRoute('/console/tenant-settings/oidc-configs')({
  component: DeploymentSettingsPage,
})
