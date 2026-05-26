import { createFileRoute } from '@tanstack/react-router'
import { ConsoleOnboardingPage } from '@/features/console/extracted/onboarding'

export const Route = createFileRoute('/console/onboarding')({
  component: ConsoleOnboardingPage,
})
