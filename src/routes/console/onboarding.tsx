import { createFileRoute } from '@tanstack/react-router'
import { ConsoleOnboardingPage } from '@/features/console/console'

export const Route = createFileRoute('/console/onboarding')({
  component: ConsoleOnboardingPage,
})
