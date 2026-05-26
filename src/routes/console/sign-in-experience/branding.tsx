import { createFileRoute } from '@tanstack/react-router'
import { BrandingPage } from '@/features/console/extracted/branding-content/branding'

export const Route = createFileRoute('/console/sign-in-experience/branding')({
  component: BrandingPage,
})
