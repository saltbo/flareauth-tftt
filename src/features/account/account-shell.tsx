import { Link, useNavigate } from '@tanstack/react-router'
import {
  Check,
  ChevronRight,
  Languages,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BrandIdentity, brandingStyle } from '@/components/layout/auth-layout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Status } from '@/components/ui/status'
import { signOut } from '@/lib/auth-client'
import { normalizeLanguage, tt } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { AccountCenterSection, defaultAccountCenterSettings } from './settings'
import type { UserProfile } from './types'

type AccountCenterSettings = typeof defaultAccountCenterSettings

export function AccountPageShell({
  accountCenter,
  children,
  config,
  profile,
  section,
}: {
  accountCenter: AccountCenterSettings
  children: ReactNode
  config: Parameters<typeof brandingStyle>[0]
  profile: UserProfile | null
  section: AccountCenterSection
}) {
  const navigate = useNavigate()
  async function signOutFromAccount() {
    try {
      await signOut()
      toast.success(tt('Sign out'))
      await navigate({ to: '/sign-in' })
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? tt(mutationError.message) : tt('Account update failed.'))
    }
  }
  return (
    <main className="accountShell" style={brandingStyle(config)}>
      <div className="accountChrome">
        <div className="accountTopbar">
          <BrandIdentity config={config} />
          <div className="accountTopbarActions">
            {profile ? <AccountUserMenu profile={profile} onSignOut={() => void signOutFromAccount()} /> : null}
          </div>
        </div>
        <section className="accountContent">
          <div className="accountWorkspace">
            <AccountSidebar accountCenter={accountCenter} section={section} />
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

export function AccountPageLoading({ config }: { config: Parameters<typeof brandingStyle>[0] }) {
  const { t } = useTranslation()
  return (
    <main className="accountShell" style={brandingStyle(config)}>
      <div className="accountChrome">
        <div className="accountTopbar">
          <BrandIdentity config={config} />
        </div>
        <section className="accountContent">
          <Status>
            <LoaderCircle className="spin" size={18} />
            {t('account.loading')}
          </Status>
        </section>
      </div>
    </main>
  )
}

export function AccountPageError({
  config,
  message,
}: {
  config: Parameters<typeof brandingStyle>[0]
  message: string
}) {
  return (
    <main className="accountShell" style={brandingStyle(config)}>
      <div className="accountChrome">
        <div className="accountTopbar">
          <BrandIdentity config={config} />
        </div>
        <section className="accountContent">
          <Status tone="error">{message}</Status>
        </section>
      </div>
    </main>
  )
}

function AccountSidebar({
  accountCenter,
  section,
}: {
  accountCenter: AccountCenterSettings
  section: AccountCenterSection
}) {
  const items = accountNavItems(accountCenter)
  return (
    <aside className="accountSidebar" aria-label={tt('Account center')}>
      <nav className="accountNav" aria-label={tt('Account center')}>
        {items.map((item) => (
          <Link
            aria-current={section === item.section ? 'page' : undefined}
            className="accountNavItem"
            data-active={section === item.section ? 'true' : undefined}
            key={item.section}
            to={item.href}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function accountNavItems(accountCenter: AccountCenterSettings) {
  return [
    { section: 'profile' as const, href: '/profile', label: tt('Profile'), icon: <UserRound size={18} /> },
    { section: 'security' as const, href: '/security', label: tt('Security'), icon: <Settings size={18} /> },
    ...(accountCenter.connectedAccountsEnabled
      ? [
          {
            section: 'connections' as const,
            href: '/connections',
            label: tt('Connections'),
            icon: <ChevronRight size={18} />,
          },
        ]
      : []),
  ]
}

function AccountUserMenu({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const { i18n } = useTranslation()
  const { setTheme, theme } = useTheme()
  const language = normalizeLanguage(i18n.language)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={tt('Account menu')} className="accountAvatarMenuTrigger">
        {profile.image ? (
          <img alt="" className="accountMenuAvatar accountMenuAvatarTrigger" src={profile.image} />
        ) : (
          <span className="accountMenuAvatar accountMenuAvatarFallback">
            <UserRound size={18} />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem disabled>
          <span>{profile.email}</span>
        </DropdownMenuItem>
        {profile.role === 'admin' ? (
          <Link
            className="flex min-h-8 w-full items-center rounded-sm px-2 text-left text-sm hover:bg-muted"
            to="/console"
          >
            <LayoutDashboard size={16} />
            <span>{tt('Console')}</span>
          </Link>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages size={16} />
            <span>{tt('Language')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <AccountPreferenceSubmenu
              options={[
                { label: 'English', active: language === 'en', onSelect: () => void i18n.changeLanguage('en') },
                { label: '简体中文', active: language === 'zh', onSelect: () => void i18n.changeLanguage('zh') },
              ]}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{tt('Theme')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <AccountPreferenceSubmenu
              options={[
                { label: tt('Light'), active: theme === 'light', onSelect: () => setTheme('light') },
                { label: tt('Dark'), active: theme === 'dark', onSelect: () => setTheme('dark') },
              ]}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut size={16} />
          <span>{tt('account.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountPreferenceSubmenu({
  options,
}: {
  options: Array<{ label: string; active: boolean; onSelect: () => void }>
}) {
  return (
    <>
      {options.map((option) => (
        <DropdownMenuItem
          aria-checked={option.active}
          className="accountSubmenuItem"
          key={option.label}
          onClick={option.onSelect}
          role="menuitemradio"
        >
          <Check aria-hidden="true" className={option.active ? 'accountSubmenuCheck' : 'accountSubmenuCheckHidden'} />
          <span>{option.label}</span>
        </DropdownMenuItem>
      ))}
    </>
  )
}
