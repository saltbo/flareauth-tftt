import { createFileRoute } from '@tanstack/react-router'
import { ContentSettingsPage } from '@/features/console/console'

export const Route = createFileRoute('/console/sign-in-experience/content')({
  component: ContentSettingsPage,
})
