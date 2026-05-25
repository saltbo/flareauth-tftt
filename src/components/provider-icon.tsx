import { Fingerprint, Link2, Mail, MousePointer, Smartphone, Wallet } from 'lucide-react'

type ProviderIconProps = {
  className?: string
  provider: {
    displayName: string
    icon: string
    providerId?: string
  }
}

const simpleIconSlugs: Record<string, string> = {
  apple: 'apple',
  atlassian: 'atlassian',
  cognito: 'amazoncognito',
  discord: 'discord',
  dropbox: 'dropbox',
  facebook: 'facebook',
  figma: 'figma',
  github: 'github',
  gitlab: 'gitlab',
  google: 'google',
  huggingface: 'huggingface',
  kakao: 'kakao',
  kick: 'kick',
  line: 'line',
  linear: 'linear',
  linkedin: 'linkedin',
  microsoft: 'microsoft',
  naver: 'naver',
  notion: 'notion',
  paybin: 'paybin',
  paypal: 'paypal',
  polar: 'polar',
  railway: 'railway',
  reddit: 'reddit',
  roblox: 'roblox',
  salesforce: 'salesforce',
  slack: 'slack',
  spotify: 'spotify',
  tiktok: 'tiktok',
  twitch: 'twitch',
  twitter: 'x',
  vercel: 'vercel',
  vk: 'vk',
  wechat: 'wechat',
  zoom: 'zoom',
}

export function ProviderIcon({ className = 'providerIcon', provider }: ProviderIconProps) {
  const slug = simpleIconSlugs[provider.icon] ?? simpleIconSlugs[provider.providerId ?? '']

  return (
    <span aria-hidden="true" className={className}>
      {provider.icon === 'email' ? <Mail size={16} /> : null}
      {provider.icon === 'phone' ? <Smartphone size={16} /> : null}
      {provider.icon === 'wallet' ? <Wallet size={16} /> : null}
      {provider.icon === 'passkey' ? <Fingerprint size={16} /> : null}
      {provider.icon === 'onetap' ? <MousePointer size={16} /> : null}
      {!builtinIcon(provider.icon) && slug ? (
        <img alt="" height="16" src={`https://cdn.simpleicons.org/${slug}`} width="16" />
      ) : null}
      {!builtinIcon(provider.icon) && !slug ? <Link2 size={16} /> : null}
    </span>
  )
}

function builtinIcon(icon: string) {
  return icon === 'email' || icon === 'phone' || icon === 'wallet' || icon === 'passkey' || icon === 'onetap'
}
