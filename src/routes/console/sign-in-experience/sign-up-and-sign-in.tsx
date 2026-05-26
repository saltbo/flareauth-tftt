import { createFileRoute } from '@tanstack/react-router'
import { SignInSettingsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/sign-in-experience/sign-up-and-sign-in')({
  component: SignInSettingsPage,
})
