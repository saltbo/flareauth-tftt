import { createFileRoute } from '@tanstack/react-router'
import { BrandingPage } from '@/features/console/console'

export const Route = createFileRoute('/console/sign-in-experience/branding')({
  component: BrandingPage,
})
