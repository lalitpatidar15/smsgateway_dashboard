import { useCallback, useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { AuditLog, Paged } from '../types'
import { Alert, Drawer, EmptyState, Pager, Spinner } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [data, setData] = useState<Paged<AuditLog> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await apiRequest<Paged<AuditLog>>('/api/v1/admin/audit-logs', {
        auth: 'jwt',
        query: { page, limit },
      })
      setData(res)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    load()
  }, [load])

  const rows = data?.data ?? []
  const pagination = data?.pagination

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-sub">Administrative and system actions</p>
        </div>
        <button className="btn btn-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Loading audit logs…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No audit logs yet" />
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr key={log.id} className="clickable" onClick={() => setSelected(log)}>
                    <td className="muted" title={formatDateTime(log.createdAt)}>
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="mono">{log.actorType}{log.actorId ? `:${log.actorId.slice(0,8)}…` : ''}</td>
                    <td>{log.action}</td>
                    <td className="mono">{log.resourceType ?? '—'}{log.resourceId ? `/${log.resourceId.slice(0,8)}…` : ''}</td>
                    <td className="mono faint">{log.ip ?? '—'}</td>
                    <td className="muted">{log.metadata ? '{…}' : '—'}</td>
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

      {selected && (
        <Drawer title="Audit log detail" onClose={() => setSelected(null)}>
          <dl className="kv">
            <dt>ID</dt>
            <dd className="mono">{selected.id}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(selected.createdAt)}</dd>
            <dt>Actor</dt>
            <dd className="mono">{selected.actorType}{selected.actorId ? `/${selected.actorId}` : ''}</dd>
            <dt>Action</dt>
            <dd className="mono">{selected.action}</dd>
            <dt>Resource</dt>
            <dd className="mono">{selected.resourceType ?? '—'}{selected.resourceId ? `/${selected.resourceId}` : ''}</dd>
            <dt>IP</dt>
            <dd className="mono">{selected.ip ?? '—'}</dd>
          </dl>
          {selected.metadata && (
            <>
              <hr className="section-divider" />
              <div className="card-title">Metadata</div>
              <pre className="meta-json">{JSON.stringify(selected.metadata, null, 2)}</pre>
            </>
          )}
        </Drawer>
      )}
    </main>
  )
}
