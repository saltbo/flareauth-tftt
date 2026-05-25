import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { tt } from '@/lib/i18n'
import type { DestructiveConfirmation, ListItem } from './types'

export function PanelTitle({
  action,
  title,
  description,
  icon,
}: {
  action?: ReactNode
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="panelTitle">
      <div className="panelTitleMain">
        <div className="panelTitleIcon" aria-hidden="true">
          {icon}
        </div>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="statusPill">
      <span>{value}</span>
      <strong>{label}</strong>
    </div>
  )
}

export function SettingsAction({
  action,
  icon,
  meta,
  status,
  title,
  value,
}: {
  action?: ReactNode
  icon: ReactNode
  meta: string
  status?: string
  title: string
  value?: string
}) {
  return (
    <article className="settingsAction">
      <div className="settingsActionMain">
        <div className="settingsActionIcon" aria-hidden="true">
          {icon}
        </div>
        <div>
          <h3>{title}</h3>
          {value ? <strong>{value}</strong> : null}
          <p>{meta}</p>
          {status ? <p>{status}</p> : null}
        </div>
      </div>
      {action}
    </article>
  )
}

export function SubsectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="subsectionTitle">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export function ItemList({
  empty,
  emptyDescription = tt('Nothing needs attention here.'),
  items,
}: {
  empty: string
  emptyDescription?: string
  items: ListItem[]
}) {
  return (
    <div className="itemList">
      {items.length === 0 ? (
        <article className="itemRow itemRowEmpty">
          <div>
            <h3>{empty}</h3>
            <p>{emptyDescription}</p>
          </div>
        </article>
      ) : (
        items.map((item) => (
          <article className="itemRow" key={item.id}>
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="itemRowMain">
                {item.icon ? (
                  <div className="itemRowIcon" aria-hidden="true">
                    {item.icon}
                  </div>
                ) : null}
                <div>
                  <div className="itemRowTitle">
                    <h3>{item.title}</h3>
                    {item.status ? <span>{item.status}</span> : null}
                  </div>
                  <p>{item.meta}</p>
                </div>
              </div>
              {item.children}
            </div>
            {item.action}
          </article>
        ))
      )}
    </div>
  )
}

export function DestructiveConfirmationDialog({
  confirmation,
  onClose,
}: {
  confirmation: DestructiveConfirmation | null
  onClose: () => void
}) {
  if (!confirmation) return null
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmation.title}</DialogTitle>
          <DialogDescription>{confirmation.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            {tt('Cancel')}
          </Button>
          <Button
            onClick={() => {
              const confirmed = confirmation
              onClose()
              void confirmed.onConfirm()
            }}
            type="button"
            variant="danger"
          >
            {confirmation.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function useDestructiveConfirmation() {
  return useState<DestructiveConfirmation | null>(null)
}

export function UnavailableSection({ message }: { message: string }) {
  return (
    <section className="settingsPanel">
      <article className="itemRow itemRowEmpty">
        <div>
          <h3>{message}</h3>
          <p>{tt('Nothing needs attention here.')}</p>
        </div>
      </article>
    </section>
  )
}
