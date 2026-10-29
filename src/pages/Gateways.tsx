import { useCallback, useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { Gateway } from '../types'
import { Alert, ConfirmDialog, Drawer, EmptyState, ErrorState, Spinner, StatusBadge } from '../components/ui'
import { canDelete, canManage, formatDateTime, timeAgo } from '../lib/utils'
import { useAuth } from '../auth/AuthContext'

export default function Gateways() {
  const { user } = useAuth()
  const [gateways, setGateways] = useState<Gateway[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Gateway | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Gateway | null>(null)

  const manage = canManage(user?.role)
  const remove = canDelete(user?.role)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await apiRequest<Gateway[]>('/api/v1/gateways', { auth: 'jwt' })
      setGateways(res)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    apiRequest<Gateway>(`/api/v1/gateways/${selectedId}`, { auth: 'jwt' })
      .then((g) => {
        if (!cancelled) setDetail(g)
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

  const runAction = async (kind: 'enable' | 'disable' | 'delete', id: string) => {
    setActionBusy(true)
    setActionError('')
    try {
      if (kind === 'delete') {
        await apiRequest<void>(`/api/v1/gateways/${id}`, { method: 'DELETE', auth: 'jwt' })
        setConfirmDelete(null)
        setSelectedId(null)
        await load(true)
      } else {
        const updated = await apiRequest<Gateway>(`/api/v1/gateways/${id}/${kind}`, { method: 'POST', auth: 'jwt' })
        setDetail((d) => (d && d.id === id ? { ...d, ...updated } : d))
        await load(true)
      }
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  if (loading && !gateways) return <Spinner label="Loading gateways…" />
  if (error && !gateways) return <ErrorState message={error} onRetry={() => load()} />

  const list = gateways ?? []

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Gateways</h1>
          <p className="page-sub">{list.length} registered device{list.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!manage && (
        <Alert kind="info">Your role can view gateways. Enable/disable requires ADMIN or SUPER_ADMIN.</Alert>
      )}

      {list.length === 0 ? (
        <div className="card">
          <EmptyState title="No gateways registered" hint="Register a device from the mobile app or gateway service." />
        </div>
      ) : (
        <div className="gateway-grid">
          {list.map((g) => (
            <div key={g.id} className="gateway-card" onClick={() => setSelectedId(g.id)}>
              <div className="g-head">
                <div>
                  <div className="g-name">{g.name}</div>
                  <div className="g-id">{g.deviceId}</div>
                </div>
                <StatusBadge status={g.status} kind="gateway" />
              </div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {g.model ?? g.platform}
                {g.phoneNumber ? ` · ${g.phoneNumber}` : ''}
              </div>
              <div className="g-stats">
                <div className="g-stat">
                  <div className="l">Battery</div>
                  <div className="v">{g.battery ?? '—'}%</div>
                </div>
                <div className="g-stat">
                  <div className="l">Network</div>
                  <div className="v" style={{ fontSize: 12.5 }}>
                    {g.network ?? '—'}
                  </div>
                </div>
                <div className="g-stat">
                  <div className="l">SIMs</div>
                  <div className="v">{g.simCount}</div>
                </div>
              </div>
              <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
                Last seen {timeAgo(g.lastSeenAt)}
                {g.charging ? ' · charging' : ''}
                {g.signalStrength !== null && g.signalStrength !== undefined ? ` · ${g.signalStrength} dBm` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <Drawer
          title={
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{detail?.name ?? 'Gateway'}</div>
              <div className="mono faint" style={{ fontSize: 11.5 }}>
                {detail?.deviceId ?? selectedId}
              </div>
            </div>
          }
          onClose={() => setSelectedId(null)}
        >
          {detailLoading ? (
            <Spinner label="Loading gateway…" />
          ) : detail ? (
            <>
              {actionError && <Alert kind="error">{actionError}</Alert>}
              {!manage && <Alert kind="info">Enable/disable is restricted to ADMIN and SUPER_ADMIN roles.</Alert>}
              <div className="top-actions" style={{ marginBottom: 16 }}>
                <button
                  className="btn btn-sm"
                  disabled={!manage || actionBusy || detail.status === 'ACTIVE'}
                  onClick={() => runAction('enable', detail.id)}
                  title={!manage ? 'Requires ADMIN or SUPER_ADMIN' : 'Enable this gateway'}
                >
                  Enable
                </button>
                <button
                  className="btn btn-sm"
                  disabled={!manage || actionBusy || detail.status === 'DISABLED'}
                  onClick={() => runAction('disable', detail.id)}
                  title={!manage ? 'Requires ADMIN or SUPER_ADMIN' : 'Disable this gateway'}
                >
                  Disable
                </button>
                <span className="spacer" />
                <button
                  className="btn btn-sm btn-danger"
                  disabled={!remove || actionBusy}
                  onClick={() => setConfirmDelete(detail)}
                  title={!remove ? 'Requires SUPER_ADMIN' : 'Delete this gateway'}
                >
                  Delete
                </button>
              </div>

              <dl className="kv">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={detail.status} kind="gateway" />
                </dd>
                <dt>Phone</dt>
                <dd className="mono">{detail.phoneNumber ?? '—'}</dd>
                <dt>Platform</dt>
                <dd>{detail.platform}</dd>
                <dt>Manufacturer</dt>
                <dd>{detail.manufacturer ?? '—'}</dd>
                <dt>Model</dt>
                <dd>{detail.model ?? '—'}</dd>
                <dt>Android</dt>
                <dd>{detail.androidVersion ?? '—'}</dd>
                <dt>App version</dt>
                <dd>{detail.appVersion ?? '—'}</dd>
                <dt>Battery</dt>
                <dd>
                  {detail.battery ?? '—'}%{detail.charging ? ' · charging' : ''}
                </dd>
                <dt>Network</dt>
                <dd>{detail.network ?? '—'}</dd>
                <dt>Signal</dt>
                <dd>{detail.signalStrength !== null && detail.signalStrength !== undefined ? `${detail.signalStrength} dBm` : '—'}</dd>
                <dt>Last seen</dt>
                <dd>{formatDateTime(detail.lastSeenAt)}</dd>
                <dt>Created</dt>
                <dd>{formatDateTime(detail.createdAt)}</dd>
                <dt>Updated</dt>
                <dd>{formatDateTime(detail.updatedAt)}</dd>
              </dl>

              <hr className="section-divider" />
              <div className="card-title">SIM slots ({detail.sims.length})</div>
              {detail.sims.length === 0 ? (
                <p className="faint">No SIM information reported.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Slot</th>
                        <th>Carrier</th>
                        <th>Number</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sims.map((sim, i) => (
                        <tr key={sim.id ?? i}>
                          <td>{sim.slotIndex ?? i + 1}</td>
                          <td>{sim.carrier ?? '—'}</td>
                          <td className="mono">{sim.number ?? '—'}</td>
                          <td>{sim.state ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <ErrorState message={actionError || 'Failed to load gateway'} />
          )}
        </Drawer>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete gateway"
          message={`Delete “${confirmDelete.name}” (${confirmDelete.deviceId})? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => runAction('delete', confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </main>
  )
}
