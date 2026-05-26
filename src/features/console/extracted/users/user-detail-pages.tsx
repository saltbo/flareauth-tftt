import { UserDetailPage } from './user-detail'

export function UserProfilePage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="profile" />
}

export function UserSecurityPage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="security" />
}

export function UserSessionsPage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="sessions" />
}

export function UserLinkedAccountsPage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="linked-accounts" />
}

export function UserApplicationsPage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="applications" />
}

export function UserOperationsPage({ userId }: { userId: string }) {
  return <UserDetailPage userId={userId} section="operations" />
}
