import type { AccountProfileResponse } from '@shared/api/account'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  AppWindow,
  BellRing,
  Boxes,
  Building2,
  Cable,
  Code2,
  Fingerprint,
  Gauge,
  KeyRound,
  LockKeyhole,
  Menu,
  Network,
  Settings,
  Shield,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getAccountProfile } from '@/lib/api/account'
import { signOut } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

type ConsoleNavItem = {
  href: string
  icon: typeof Gauge
  label: string
  match?: string
}

type ConsoleNavGroup = {
  items: ConsoleNavItem[]
  label: string
}

const adminNavGroups: ConsoleNavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/console', label: 'Dashboard', icon: Gauge }],
  },
  {
    label: 'Authentication',
    items: [
      { href: '/console/applications', label: 'Applications', icon: AppWindow },
      {
        href: '/console/sign-in-experience/sign-up-and-sign-in',
        label: 'Sign-in & account',
        icon: Fingerprint,
        match: '/console/sign-in-experience',
      },
      {
        href: '/console/mfa',
        label: 'Multi-factor auth',
        icon: ShieldCheck,
      },
      {
        href: '/console/connectors',
        label: 'Connectors',
        icon: Cable,
        match: '/console/connectors',
      },
      {
        href: '/console/security/captcha',
        label: 'Security',
        icon: Shield,
        match: '/console/security',
      },
    ],
  },
  {
    label: 'Authorization',
    items: [
      { href: '/console/api-resources', label: 'API resources', icon: KeyRound },
      { href: '/console/roles', label: 'Roles', icon: LockKeyhole },
      {
        href: '/console/organization-template/organization-roles',
        label: 'Organization template',
        icon: Network,
        match: '/console/organization-template',
      },
    ],
  },
  {
    label: 'Users',
    items: [
      { href: '/console/organizations', label: 'Organizations', icon: Building2 },
      { href: '/console/users', label: 'User management', icon: UsersRound },
    ],
  },
  {
    label: 'Developer',
    items: [
      { href: '/console/customize-jwt', label: 'Custom JWT', icon: Code2 },
      {
        href: '/console/webhooks/endpoints',
        label: 'Webhooks',
        icon: BellRing,
        match: '/console/webhooks',
      },
    ],
  },
  {
    label: 'Tenant',
    items: [
      {
        href: '/console/tenant-settings/oidc-configs',
        label: 'Settings',
        icon: Settings,
        match: '/console/tenant-settings',
      },
    ],
  },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profile, setProfile] = useState<AccountProfileResponse['user'] | null>(null)

  useEffect(() => {
    let active = true
    void getAccountProfile().then((response) => {
      if (active) setProfile(response.user)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="consoleShell text-foreground">
      <header className="consoleTopbar">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close console navigation' : 'Open console navigation'}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              type="button"
            >
              {mobileNavOpen ? (
                <X aria-hidden="true" className="size-4" />
              ) : (
                <Menu aria-hidden="true" className="size-4" />
              )}
            </button>
            <ConsoleBrand />
          </div>
          <div className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm lg:flex">
              <Boxes className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">Default</span>
            </div>
            <ConsoleAccountMenu profile={profile} />
          </div>
        </div>
      </header>
      {mobileNavOpen ? (
        <div className="consoleMobileNavLayer lg:hidden">
          <button
            aria-label="Dismiss console navigation"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(320px,calc(100vw-32px))] border-r border-border bg-background shadow-lg">
            <nav aria-label="Console mobile" className="consoleNavScroll h-full overflow-y-auto px-3 py-4">
              <AdminNavigation onNavigate={() => setMobileNavOpen(false)} pathname={pathname} />
            </nav>
          </aside>
        </div>
      ) : null}
      <div className="consoleBody lg:flex">
        <aside className="consoleRail hidden lg:flex">
          <nav className="consoleNavScroll min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-label="Console">
            <AdminNavigation pathname={pathname} />
          </nav>
        </aside>
        <main className="consoleMain">
          <div className="consoleContent">{children}</div>
        </main>
      </div>
    </div>
  )
}

function ConsoleBrand() {
  return (
    <a className="flex h-10 min-w-0 items-center gap-3 text-foreground" href="/console">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        F
      </span>
      <span className="truncate text-sm font-semibold leading-none">FlareAuth</span>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
      <span className="truncate text-sm font-medium text-muted-foreground">Admin Console</span>
    </a>
  )
}

function ConsoleAccountMenu({ profile }: { profile: AccountProfileResponse['user'] | null }) {
  async function onSignOut() {
    await signOut()
    window.location.href = '/sign-in'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="size-9 rounded-full p-0">
        <ConsoleAvatar profile={profile} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        <DropdownMenuGroup>
          <a
            className="flex min-h-8 w-full items-center rounded-sm px-2 text-left text-sm hover:bg-muted"
            href="/profile"
            role="menuitem"
          >
            Profile
          </a>
          <DropdownMenuItem onClick={() => void onSignOut()}>退出登录</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ConsoleAvatar({ profile }: { profile: AccountProfileResponse['user'] | null }) {
  const fallback = (profile?.displayName || profile?.email || 'A').trim().slice(0, 1).toUpperCase()

  if (profile?.image) {
    return <img alt="" className="size-8 rounded-full object-cover" src={profile.image} width="32" height="32" />
  }

  return (
    <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {fallback}
    </span>
  )
}

function AdminNavigation({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  return (
    <div className="grid gap-3">
      {adminNavGroups.map((group) => (
        <div className="grid gap-1" key={group.label}>
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, getItemMatchPath(item))
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                )}
                key={item.href}
                onClick={onNavigate}
                to={item.href}
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function getItemMatchPath(item: ConsoleNavItem) {
  return item.match ?? item.href
}

function isActive(pathname: string, href: string) {
  if (href === '/console') return pathname === href || pathname === '/console/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}
