import { createFileRoute } from '@tanstack/react-router'
import { OrganizationTemplatePage } from '@/features/console/console'

export const Route = createFileRoute('/console/organization-template/organization-permissions')({
  component: () => <OrganizationTemplatePage section="organization-permissions" />,
})
