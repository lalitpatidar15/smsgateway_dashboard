import { useCallback, useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { DashboardStats, HealthResponse, MetricsSnapshot } from '../types'
import { Alert, ErrorState, Spinner } from '../components/ui'
import { formatDuration } from '../lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null)
  const [health, setHealth] = useState<'unknown' | 'ok' | 'bad'>('unknown')
  const [healthAt, setHealthAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [metricsError, setMetricsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [s, h] = await Promise.all([
        apiRequest<DashboardStats>('/api/v1/admin/dashboard', { auth: 'jwt' }),
        apiRequest<HealthResponse>('/health', { auth: 'none' }),
      ])
      setStats(s)
      setHealth(h.status === 'ok' ? 'ok' : 'bad')
      setHealthAt(new Date().toLocaleTimeString())
      setError('')
      setRefreshedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(errorMessage(err))
      setHealth('bad')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    try {
      const m = await apiRequest<MetricsSnapshot>('/api/v1/admin/metrics', { auth: 'jwt' })
      setMetrics(m)
      setMetricsError('')
    } catch (err) {
      setMetricsError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    load()
    loadMetrics()
    const timer = window.setInterval(() => {
      load(true)
      loadMetrics()
    }, 30000)
    const healthTimer = window.setInterval(async () => {
      try {
        const h = await apiRequest<HealthResponse>('/health', { auth: 'none' })
        setHealth(h.status === 'ok' ? 'ok' : 'bad')
        setHealthAt(new Date().toLocaleTimeString())
      } catch {
        setHealth('bad')
      }
    }, 15000)
    return () => {
      window.clearInterval(timer)
      window.clearInterval(healthTimer)
    }
  }, [load, loadMetrics])

  if (loading && !stats) return <Spinner label="Loading dashboard…" />
  if (error && !stats) return <ErrorState message={error} onRetry={() => load()} />

  const sms = stats?.sms
  const gw = stats?.gateways

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {refreshedAt ? `Refreshed at ${refreshedAt} · auto-refresh every 30s` : 'Gateway and SMS overview'}
          </p>
        </div>
        <div className="top-actions">
          <span className={`health-dot ${health === 'ok' ? 'ok' : health === 'bad' ? 'bad' : ''}`}>
            <span className="dot" />
            {health === 'ok' ? `API online${healthAt ? ` · ${healthAt}` : ''}` : health === 'bad' ? 'API unreachable' : 'Checking…'}
          </span>
          <button className="btn btn-sm" onClick={() => { load(); loadMetrics() }}>
            Refresh
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <div className="stat-card stat-accent">
          <span className="label">Gateways total</span>
          <span className="value">{gw?.total ?? '—'}</span>
          <span className="hint">Registered devices</span>
        </div>
        <div className="stat-card stat-green">
          <span className="label">Gateways online</span>
          <span className="value">{gw?.online ?? '—'}</span>
          <span className="hint">Heartbeating now</span>
        </div>
        <div className="stat-card stat-red">
          <span className="label">Gateways offline</span>
          <span className="value">{gw?.offline ?? '—'}</span>
          <span className="hint">No recent heartbeat</span>
        </div>
        <div className="stat-card stat-purple">
          <span className="label">SMS today</span>
          <span className="value">{sms?.today ?? '—'}</span>
          <span className="hint">Created since midnight</span>
        </div>
      </div>

      <div className="grid grid-stats">
        <div className="stat-card stat-accent">
          <span className="label">Queued</span>
          <span className="value">{sms?.queued ?? '—'}</span>
        </div>
        <div className="stat-card stat-accent">
          <span className="label">Sent</span>
          <span className="value">{sms?.sent ?? '—'}</span>
        </div>
        <div className="stat-card stat-green">
          <span className="label">Delivered</span>
          <span className="value">{sms?.delivered ?? '—'}</span>
        </div>
        <div className="stat-card stat-red">
          <span className="label">Failed</span>
          <span className="value">{sms?.failed ?? '—'}</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">API Metrics</div>
        {metricsError ? (
          <Alert kind="warning">Metrics unavailable: {metricsError}</Alert>
        ) : metrics ? (
          <>
            <div className="metrics-bar">
              <div className="metric-item">
                <div className="m-label">Uptime</div>
                <div className="m-value">{formatDuration(metrics.uptimeSec)}</div>
              </div>
              <div className="metric-item">
                <div className="m-label">Requests</div>
                <div className="m-value">{metrics.totalRequests}</div>
              </div>
              <div className="metric-item">
                <div className="m-label">Errors</div>
                <div className="m-value" style={{ color: metrics.totalErrors > 0 ? 'var(--red)' : undefined }}>
                  {metrics.totalErrors}
                </div>
              </div>
              <div className="metric-item">
                <div className="m-label">RSS memory</div>
                <div className="m-value">{metrics.memory?.rssMB ?? '—'} MB</div>
              </div>
              <div className="metric-item">
                <div className="m-label">Heap used</div>
                <div className="m-value">{metrics.memory?.heapUsedMB ?? '—'} MB</div>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Count</th>
                    <th>Errors</th>
                    <th>Avg ms</th>
                    <th>Max ms</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics.routes ?? []).map((r) => (
                    <tr key={r.route}>
                      <td className="mono">{r.route}</td>
                      <td>{r.count}</td>
                      <td style={{ color: r.errors > 0 ? 'var(--red)' : undefined }}>{r.errors}</td>
                      <td>{r.avgMs.toFixed(1)}</td>
                      <td>{r.maxMs.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Spinner label="Loading metrics…" />
        )}
      </div>
    </main>
  )
}
