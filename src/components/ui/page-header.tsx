import type { ReactNode } from 'react'

type PageHeaderProps = {
  action?: ReactNode
  description: string
  title: string
}

export function PageHeader({ action, description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-7 tracking-normal">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
