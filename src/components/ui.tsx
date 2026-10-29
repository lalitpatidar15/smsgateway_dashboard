import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      <div>{label ?? 'Loading...'}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box">
      <div className="state-title">Something went wrong</div>
      <div>{message}</div>
      {onRetry && (
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state-box">
      <div className="state-title">{title}</div>
      {hint && <div>{hint}</div>}
    </div>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'info' | 'success' | 'warning'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>
}

const SMS_TONES: Record<string, string> = {
  QUEUED: 'badge-blue',
  SCHEDULED: 'badge-purple',
  CLAIMED: 'badge-cyan',
  SENDING: 'badge-cyan',
  SENT: 'badge-blue',
  DELIVERED: 'badge-green',
  FAILED: 'badge-red',
  RETRYING: 'badge-amber',
  EXPIRED: 'badge-gray',
  CANCELLED: 'badge-gray',
}

const GATEWAY_TONES: Record<string, string> = {
  ACTIVE: 'badge-green',
  OFFLINE: 'badge-red',
  DEGRADED: 'badge-amber',
  PENDING: 'badge-purple',
  DISABLED: 'badge-gray',
  BLOCKED: 'badge-red',
}

export function StatusBadge({ status, kind = 'sms' }: { status: string; kind?: 'sms' | 'gateway' | 'key' }) {
  const tone =
    kind === 'gateway'
      ? GATEWAY_TONES[status] ?? 'badge-gray'
      : kind === 'key'
        ? status === 'ACTIVE'
          ? 'badge-green'
          : 'badge-red'
        : SMS_TONES[status] ?? 'badge-gray'
  return <span className={`badge ${tone}`}>{status}</span>
}

export function Pager({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) {
    return (
      <div className="pager">
        <span className="info">{total} total</span>
      </div>
    )
  }
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="pager">
      <span className="info">
        {from}-{to} of {total}
      </span>
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span className="info">
        Page {page} / {totalPages}
      </span>
      <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  )
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`}>
        <h3>{title}</h3>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function Drawer({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="drawer-overlay" onMouseDown={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          {title}
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function useCopy(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])
  const copy = (text: string) => {
    const done = () => {
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done)
    } else {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      done()
    }
  }
  return { copied, copy }
}
