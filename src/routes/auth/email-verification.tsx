import { createFileRoute } from '@tanstack/react-router'
import { EmailVerificationPage } from '@/features/auth/pages/recovery'

export const Route = createFileRoute('/auth/email-verification')({
  component: EmailVerificationPage,
})
