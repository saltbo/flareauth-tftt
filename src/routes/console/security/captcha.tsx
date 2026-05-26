import { createFileRoute } from '@tanstack/react-router'
import { SecurityCaptchaPage } from '@/features/console/extracted/security-settings'

export const Route = createFileRoute('/console/security/captcha')({
  component: SecurityCaptchaPage,
})
