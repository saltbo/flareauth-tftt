import { createFileRoute } from '@tanstack/react-router'
import { SignUpPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUpPage,
})
