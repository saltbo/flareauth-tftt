import { createFileRoute } from '@tanstack/react-router'
import { OnboardingRoute } from '@/features/auth/onboarding-page'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
})
