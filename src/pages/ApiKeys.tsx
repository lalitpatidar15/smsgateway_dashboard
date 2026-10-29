import { useCallback, useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { ApiKey } from '../types'
import { Alert, ConfirmDialog, ErrorState, Modal, Pager, Spinner, StatusBadge, useCopy } from '../components/ui'
import { canDelete, formatDateTime } from '../lib/utils'
import { useAuth } from '../auth/AuthContext'

export default function ApiKeys() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<ApiKey | null>(null)
  const { copied: copyKeyCopied, copy } = useCopy()
  const [actionError, setActionError] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; type: 'revoke' | 'delete' } | null>(null)

  const canDel = canDelete(user?.role)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await apiRequest<ApiKey[]>('/api/v1/admin/api-keys', { auth: 'jwt' })
      setKeys(res)
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

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    setActionError('')
    try {
      const res = await apiRequest<ApiKey>('/api/v1/admin/api-keys', {
        method: 'POST',
        auth: 'jwt',
        body: { name: name.trim() },
      })
      setCreated(res)
      setName('')
      await load(true)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setBusy(true)
    setActionError('')
    try {
      await apiRequest<void>(`/api/v1/admin/api-keys/${id}/revoke`, { method: 'POST', auth: 'jwt' })
      await load(true)
      setConfirm(null)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    setActionError('')
    try {
      await apiRequest<void>(`/api/v1/admin/api-keys/${id}`, { method: 'DELETE', auth: 'jwt' })
      await load(true)
      setConfirm(null)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !keys) return <Spinner label="Loading API keys…" />
  if (error && !keys) return <ErrorState message={error} onRetry={() => load()} />

  const list = (keys ?? []).sort((a, b) => (b.createdAt.localeCompare(a.createdAt)))
  const paged = list.slice((page - 1) * limit, page * limit)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="page-sub">{total} key{total === 1 ? '' : 's'} · prefixes sg_live_</p>
        </div>
        <div className="top-actions">
          <button className="btn btn-primary" onClick={() => { setCreateOpen(true); setCreated(null); setName(''); setActionError('') }}>
            Create API key
          </button>
          <button className="btn btn-sm" onClick={() => load()}>
            Refresh
          </button>
        </div>
      </div>

      {actionError && <Alert kind="error">{actionError}</Alert>}

      {list.length === 0 ? (
        <div className="card">
          <p className="muted">No API keys created yet.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Daily limit</th>
                  <th>Rate / min</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Revoked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td className="mono">{k.keyPrefix}</td>
                    <td><StatusBadge status={k.status} kind="key" /></td>
                    <td className="muted">{k.dailyLimit ?? '—'}</td>
                    <td className="muted">{k.rateLimitPerMinute ?? '—'}</td>
                    <td className="muted">{formatDateTime(k.createdAt)}</td>
                    <td className="muted">{formatDateTime(k.lastUsedAt)}</td>
                    <td className="muted">{formatDateTime(k.revokedAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {k.status === 'ACTIVE' && (
                        <button className="btn btn-sm" disabled={busy} onClick={() => setConfirm({ id: k.id, type: 'revoke' })}>
                          Revoke
                        </button>
                      )}
                      {canDel && (
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ marginLeft: 6 }}
                          disabled={busy}
                          onClick={() => setConfirm({ id: k.id, type: 'delete' })}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
        </>
      )}

      {createOpen && (
        <Modal title="Create API key" subtitle="Copy the key — it is shown only once." onClose={() => setCreateOpen(false)}>
          {actionError && <Alert kind="error">{actionError}</Alert>}
          {!created ? (
            <>
              <div className="field">
                <label htmlFor="key-name">Name</label>
                <input
                  id="key-name"
                  className="input"
                  placeholder="Dashboard key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="modal-sub">Store this key securely. You will not see the raw secret again.</p>
              <div className="key-reveal">{created.key}</div>
              <div className="toolbar" style={{ marginBottom: 0 }}>
                  <button className="btn copy-btn" onClick={() => copy(created.key!)}>
                  {copyKeyCopied ? 'Copied ✓' : 'Copy key'}
                </button>
                <span className="spacer" />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setCreateOpen(false)
                    setCreated(null)
                  }}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'revoke' ? 'Revoke API key' : 'Delete API key'}
          message={`This ${confirm.type === 'revoke' ? 'will immediately invalidate' : 'will permanently remove'} the key for all requests.`}
          confirmLabel={confirm.type === 'revoke' ? 'Revoke' : 'Delete'}
          danger
          onConfirm={() => (confirm.type === 'revoke' ? handleRevoke(confirm.id) : handleDelete(confirm.id))}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  )
}
