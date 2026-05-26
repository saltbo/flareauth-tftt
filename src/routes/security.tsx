import { createFileRoute } from '@tanstack/react-router'
import { AccountSecurityPage } from '@/features/account/account-center'
import { requireAccountProfile } from '@/lib/route-auth'

export const Route = createFileRoute('/security')({
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AccountSecurityPage,
})
