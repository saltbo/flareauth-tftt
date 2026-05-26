import { createFileRoute } from '@tanstack/react-router'
import { OrganizationTemplatePage } from '@/features/console/extracted/deployment-misc/misc'

export const Route = createFileRoute('/console/organization-template/organization-roles')({
  component: () => <OrganizationTemplatePage section="organization-roles" />,
})
