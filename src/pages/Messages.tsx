import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { Paged, SmsJob, SmsStatus } from '../types'
import { SMS_STATUSES } from '../types'
import { Alert, Drawer, EmptyState, ErrorState, Pager, Spinner, StatusBadge } from '../components/ui'
import { formatDateTime, timeAgo } from '../lib/utils'

const CANCELABLE: SmsStatus[] = ['QUEUED', 'SCHEDULED', 'RETRYING']
const RETRYABLE: SmsStatus[] = ['FAILED', 'EXPIRED', 'CANCELLED']

export default function Messages() {
  const [status, setStatus] = useState<SmsStatus | ''>('')
  const [recipient, setRecipient] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [data, setData] = useState<Paged<SmsJob> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SmsJob | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await apiRequest<Paged<SmsJob>>('/api/v1/sms', {
          auth: 'jwt',
          query: { status: status || undefined, recipient: recipient || undefined, page, limit },
        })
        setData(res)
        setError('')
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [status, recipient, page, limit],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const t = window.setInterval(() => load(true), 10000)
    return () => window.clearInterval(t)
  }, [autoRefresh, load])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    apiRequest<SmsJob>(`/api/v1/sms/${selectedId}`, { auth: 'jwt' })
      .then((job) => {
        if (!cancelled) setDetail(job)
      })
      .catch((err) => {
        if (!cancelled) setActionError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selectStatus = (s: SmsStatus | '') => {
    setStatus(s)
    setPage(1)
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setRecipient(searchInput.trim())
    setPage(1)
  }

  const runAction = async (kind: 'cancel' | 'retry') => {
    if (!detail) return
    setActionBusy(true)
    setActionError('')
    try {
      const path = kind === 'cancel' ? `/api/v1/sms/${detail.id}/cancel` : `/api/v1/admin/sms/${detail.id}/retry`
      const updated = await apiRequest<SmsJob>(path, { method: 'POST', auth: 'jwt' })
      if (updated && updated.id) setDetail({ ...detail, ...updated })
      await load(true)
      const refreshed = await apiRequest<SmsJob>(`/api/v1/sms/${detail.id}`, { auth: 'jwt' })
      setDetail(refreshed)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  const rows = data?.data ?? []
  const pagination = data?.pagination

  const statusChips = useMemo(() => ['', ...SMS_STATUSES] as (SmsStatus | '')[], [])

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-sub">SMS jobs across all gateways</p>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-refresh (10s)
        </label>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {statusChips.map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'active' : ''}`} onClick={() => selectStatus(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <form className="toolbar" onSubmit={submitSearch}>
        <input
          className="input search-input"
          placeholder="Search recipient…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="btn" type="submit">
          Search
        </button>
        {recipient && (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setSearchInput('')
              setRecipient('')
              setPage(1)
            }}
          >
            Clear
          </button>
        )}
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => load()}>
          Refresh
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Loading messages…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No messages found" hint="Adjust filters or send an SMS from the Send page." />
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Attempts</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job) => (
                  <tr key={job.id} className="clickable" onClick={() => setSelectedId(job.id)}>
                    <td className="mono">{job.recipient}</td>
                    <td>
                      <span className="truncate">{job.message}</span>
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="muted">{job.priority}</td>
                    <td>
                      {job.attemptCount}/{job.maxAttempts}
                    </td>
                    <td className="muted" title={formatDateTime(job.createdAt)}>
                      {timeAgo(job.createdAt)}
                    </td>
                    <td className="muted" title={formatDateTime(job.updatedAt)}>
                      {timeAgo(job.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pager
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPage={setPage}
            />
          )}
        </>
      )}

      {selectedId && (
        <Drawer
          title={
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Message detail</div>
              <div className="mono faint" style={{ fontSize: 11.5 }}>
                {selectedId}
              </div>
            </div>
          }
          onClose={() => setSelectedId(null)}
        >
          {detailLoading ? (
            <Spinner label="Loading detail…" />
          ) : detail ? (
            <>
              {actionError && <Alert kind="error">{actionError}</Alert>}
              <div className="top-actions" style={{ marginBottom: 16 }}>
                <button
                  className="btn btn-sm"
                  disabled={!CANCELABLE.includes(detail.status) || actionBusy}
                  onClick={() => runAction('cancel')}
                  title={CANCELABLE.includes(detail.status) ? 'Cancel this job' : 'Only QUEUED / SCHEDULED / RETRYING jobs can be cancelled'}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!RETRYABLE.includes(detail.status) || actionBusy}
                  onClick={() => runAction('retry')}
                  title={RETRYABLE.includes(detail.status) ? 'Retry this job' : 'Only FAILED / EXPIRED / CANCELLED jobs can be retried'}
                >
                  {actionBusy ? 'Working…' : 'Retry'}
                </button>
                <span className="spacer" />
                <StatusBadge status={detail.status} />
              </div>

              <dl className="kv">
                <dt>Recipient</dt>
                <dd className="mono">{detail.recipient}</dd>
                <dt>Message</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{detail.message}</dd>
                <dt>Priority</dt>
                <dd>{detail.priority}</dd>
                <dt>Encoding</dt>
                <dd>
                  {detail.encoding} · {detail.segmentCount} segment{detail.segmentCount === 1 ? '' : 's'}
                </dd>
                <dt>Attempts</dt>
                <dd>
                  {detail.attemptCount} / {detail.maxAttempts}
                </dd>
                <dt>Gateway device</dt>
                <dd className="mono">{detail.gatewayDeviceId ?? '—'}</dd>
                <dt>Scheduled</dt>
                <dd>{formatDateTime(detail.scheduledAt)}</dd>
                <dt>Sent</dt>
                <dd>{formatDateTime(detail.sentAt)}</dd>
                <dt>Delivered</dt>
                <dd>{formatDateTime(detail.deliveredAt)}</dd>
                <dt>Failed</dt>
                <dd>{formatDateTime(detail.failedAt)}</dd>
                <dt>Created</dt>
                <dd>{formatDateTime(detail.createdAt)}</dd>
                <dt>Updated</dt>
                <dd>{formatDateTime(detail.updatedAt)}</dd>
              </dl>

              {(detail.lastErrorCode || detail.lastErrorMessage) && (
                <>
                  <hr className="section-divider" />
                  <div className="card-title">Last error</div>
                  <Alert kind="error">
                    {detail.lastErrorCode && <strong>{detail.lastErrorCode}: </strong>}
                    {detail.lastErrorMessage ?? 'No message'}
                  </Alert>
                </>
              )}

              <hr className="section-divider" />
              <div className="card-title">Attempts timeline</div>
              {detail.attempts && detail.attempts.length > 0 ? (
                <ul className="timeline">
                  {detail.attempts.map((a) => (
                    <li key={a.id} className={a.errorMessage ? 'err' : a.status === 'SENT' || a.status === 'DELIVERED' ? 'ok' : ''}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong>Attempt {a.attemptNumber}</strong>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                        Started {formatDateTime(a.startedAt)} · Sent {formatDateTime(a.sentAt)} · Completed{' '}
                        {formatDateTime(a.completedAt)}
                      </div>
                      {a.errorCode && (
                        <div style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 4 }}>
                          {a.errorCode}: {a.errorMessage}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="faint">No attempts recorded yet.</p>
              )}
            </>
          ) : (
            <ErrorState message={actionError || 'Failed to load message detail'} />
          )}
        </Drawer>
      )}
    </main>
  )
}
