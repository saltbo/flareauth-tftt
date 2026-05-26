import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ConsoleShell } from '@/components/layout/console-shell'
import { requireAccountProfile } from '@/lib/route-auth'

export const Route = createFileRoute('/console')({
  beforeLoad: async ({ location }) => {
    const profile = await requireAccountProfile(location.href)
    if (profile.user?.role !== 'admin') throw redirect({ href: '/profile' })
  },
  component: () => (
    <ConsoleShell>
      <Outlet />
    </ConsoleShell>
  ),
})
