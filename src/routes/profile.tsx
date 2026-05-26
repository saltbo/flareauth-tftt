import { createFileRoute } from '@tanstack/react-router'
import { AccountProfilePage } from '@/features/account/account-center'
import { requireAccountProfile } from '@/lib/route-auth'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AccountProfilePage,
})
