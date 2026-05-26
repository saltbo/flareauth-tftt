import { createFileRoute } from '@tanstack/react-router'
import { AccountCenterSettingsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/sign-in-experience/account-center')({
  component: AccountCenterSettingsPage,
})
