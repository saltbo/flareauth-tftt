import { createFileRoute } from '@tanstack/react-router'
import { OrganizationTemplatePage } from '@/features/console/extracted/deployment-misc/misc'

export const Route = createFileRoute('/console/organization-template/organization-permissions')({
  component: () => <OrganizationTemplatePage section="organization-permissions" />,
})
