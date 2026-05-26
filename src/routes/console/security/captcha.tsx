import { createFileRoute } from '@tanstack/react-router'
import { SecurityCaptchaPage } from '@/features/console/console'

export const Route = createFileRoute('/console/security/captcha')({
  component: SecurityCaptchaPage,
})
