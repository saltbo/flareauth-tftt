import { createFileRoute } from '@tanstack/react-router'
import { EmailVerificationPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/auth/email-verification')({
  component: EmailVerificationPage,
})
