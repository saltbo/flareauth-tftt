import { createFileRoute } from '@tanstack/react-router'
import { SignInPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/auth/sign-in')({
  component: SignInPage,
})
