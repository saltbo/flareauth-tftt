import { createFileRoute } from '@tanstack/react-router'
import { OnboardingRoute } from './-onboarding'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
})
