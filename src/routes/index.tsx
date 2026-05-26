import { createFileRoute, redirect } from '@tanstack/react-router'
import { loadAccountProfile } from './-auth'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const profile = await loadAccountProfile()
    if (!profile) throw redirect({ to: '/sign-in' })
    throw redirect({ to: '/profile' })
  },
})
