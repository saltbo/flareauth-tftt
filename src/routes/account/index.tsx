import { AccountCenter, type AccountCenterSection } from '@/features/account/account-center'

export function AccountRoute({ section = 'profile' }: { section?: AccountCenterSection }) {
  return <AccountCenter section={section} />
}
