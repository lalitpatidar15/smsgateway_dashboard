import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import type { ApiKey, BulkSendResponse, Priority, SendResult } from '../types'
import { Alert, StatusBadge } from '../components/ui'
import { analyzeSegments, formatDateTime, maskKey } from '../lib/utils'

const SEND_KEY_STORAGE = 'sg_send_api_key'

function readStoredKey(): string {
  return localStorage.getItem(SEND_KEY_STORAGE) ?? ''
}

interface BulkRow {
  to: string
  message: string
  error?: string
}

function parseBulk(text: string): BulkRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(',')
      if (idx === -1) return { to: '', message: '', error: 'Missing comma separator (phone,message)' }
      const to = line.slice(0, idx).trim()
      const message = line.slice(idx + 1).trim()
      if (!to) return { to, message, error: 'Missing phone number' }
      if (!message) return { to, message, error: 'Missing message text' }
      return { to, message }
    })
}

export default function Send() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  const [apiKey, setApiKey] = useState(readStoredKey)
  const [keyInput, setKeyInput] = useState('')
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [createdKey, setCreatedKey] = useState('')
  const [copied, setCopied] = useState(false)

  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const [scheduledAt, setScheduledAt] = useState('')
  const [provider, setProvider] = useState<'gateway' | 'twilio'>('gateway')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendResult, setSendResult] = useState<SendResult | null>(null)

  const [bulkText, setBulkText] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkResults, setBulkResults] = useState<BulkSendResponse | null>(null)

  const segmentInfo = useMemo(() => analyzeSegments(message), [message])
  const bulkRows = useMemo(() => parseBulk(bulkText), [bulkText])
  const bulkValid = bulkRows.length > 0 && bulkRows.every((r) => !r.error)

  useEffect(() => {
    setSendResult(null)
    setSendError('')
  }, [apiKey])

  const createDashboardKey = async () => {
    setKeyBusy(true)
    setKeyError('')
    try {
      const name = `Dashboard ${new Date().toISOString().slice(0, 10)}`
      const key = await apiRequest<ApiKey>('/api/v1/admin/api-keys', {
        method: 'POST',
        auth: 'jwt',
        body: { name },
      })
      if (!key.key) {
        setKeyError('Key created but no plain secret returned by the server.')
        return
      }
      localStorage.setItem(SEND_KEY_STORAGE, key.key)
      setApiKey(key.key)
      setCreatedKey(key.key)
      setKeyInput('')
    } catch (err) {
      setKeyError(errorMessage(err))
    } finally {
      setKeyBusy(false)
    }
  }

  const savePastedKey = () => {
    const value = keyInput.trim()
    if (!value) {
      setKeyError('Paste a key starting with sg_live_ first.')
      return
    }
    if (!value.startsWith('sg_live_')) {
      setKeyError('API keys must start with sg_live_')
      return
    }
    localStorage.setItem(SEND_KEY_STORAGE, value)
    setApiKey(value)
    setKeyInput('')
    setKeyError('')
  }

  const clearKey = () => {
    localStorage.removeItem(SEND_KEY_STORAGE)
    setApiKey('')
    setCreatedKey('')
    setSendResult(null)
    setSendError('')
  }

  const sendSingle = async (e: FormEvent) => {
    e.preventDefault()
    setSendError('')
    setSendResult(null)
    if (!apiKey) {
      setSendError('A sending API key is required.')
      return
    }
    setSending(true)
    try {
      const body: Record<string, unknown> = { to: to.trim(), message, priority }
      if (provider !== 'gateway') body.provider = provider
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString()
      const res = await apiRequest<SendResult>('/api/v1/sms', {
        method: 'POST',
        auth: 'apiKey',
        apiKey,
        body,
      })
      setSendResult(res)
      setMessage('')
    } catch (err) {
      setSendError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const sendBulk = async () => {
    setBulkError('')
    setBulkResults(null)
    if (!apiKey) {
      setBulkError('A sending API key is required.')
      return
    }
    if (!bulkValid) {
      setBulkError('Fix the invalid rows before sending.')
      return
    }
    setBulkSending(true)
    try {
      const res = await apiRequest<BulkSendResponse>('/api/v1/sms/bulk', {
        method: 'POST',
        auth: 'apiKey',
        apiKey,
        body: { messages: bulkRows.map((r) => ({ to: r.to, message: r.message, priority })) },
      })
      setBulkResults(res)
    } catch (err) {
      setBulkError(errorMessage(err))
    } finally {
      setBulkSending(false)
    }
  }

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Send SMS</h1>
          <p className="page-sub">Dispatch messages through an API key</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Sending API key</div>
        {keyError && <Alert kind="error">{keyError}</Alert>}
        {createdKey && (
          <Alert kind="success">
            Key created and stored locally. It is shown by the server only once — copy it now if you need it elsewhere.
          </Alert>
        )}
        {apiKey ? (
          <>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <span className="mono" style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', padding: '8px 12px', borderRadius: 7 }}>
                {maskKey(apiKey)}
              </span>
              <span className="badge badge-green">ACTIVE (local)</span>
              <span className="spacer" />
              <button className="btn btn-sm copy-btn" onClick={() => copyKey(apiKey)}>
                {copied ? 'Copied ✓' : 'Copy key'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={clearKey}>
                Remove from browser
              </button>
            </div>
            <p className="inline-note">Stored in localStorage and used as Bearer token for send requests.</p>
          </>
        ) : (
          <>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <button className="btn btn-primary" onClick={createDashboardKey} disabled={keyBusy}>
                  {keyBusy ? 'Creating…' : 'Create dashboard key'}
                </button>
                <span className="inline-note">Creates “Dashboard &lt;date&gt;” via your admin JWT.</span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="paste-key">…or paste an existing key</label>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <input
                    id="paste-key"
                    className="input"
                    placeholder="sg_live_…"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePastedKey()}
                  />
                  <button className="btn" onClick={savePastedKey}>
                    Use key
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>
          Single send
        </button>
        <button className={`tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>
          Bulk send
        </button>
      </div>

      {tab === 'single' ? (
        <div className="card">
          {sendError && <Alert kind="error">{sendError}</Alert>}
          {sendResult && (
            <Alert kind={sendResult.status === 'FAILED' ? 'error' : 'success'}>
              {sendResult.status === 'FAILED' ? (
                <>
                  Failed: {sendResult.error?.code} {sendResult.error?.message}
                </>
              ) : (
                <>
                  Queued — job <span className="mono">{sendResult.id}</span> · status {sendResult.status}
                </>
              )}
            </Alert>
          )}
          <form onSubmit={sendSingle}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="to">Recipient</label>
                <input
                  id="to"
                  className="input mono"
                  required
                  placeholder="+911234567890"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="priority">Priority</label>
                <select id="priority" className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                className="textarea"
                required
                placeholder="Type your message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="segment-meter">
                <span>
                  {segmentInfo.encoding} · {segmentInfo.units} {segmentInfo.encoding === 'GSM-7' ? 'septets' : 'code units'}
                </span>
                <span>
                  {segmentInfo.segments} segment{segmentInfo.segments === 1 ? '' : 's'} ·{' '}
                  {segmentInfo.segments <= 1 ? segmentInfo.firstSegmentLimit : segmentInfo.subsequentSegmentLimit} max per
                  segment
                </span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="scheduledAt">Schedule (optional)</label>
              <input
                id="scheduledAt"
                className="input"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="field" style={{ maxWidth: 260 }}>
              <label htmlFor="provider">Send via</label>
              <select id="provider" className="select" value={provider} onChange={(e) => setProvider(e.target.value as 'gateway' | 'twilio')}>
                <option value="gateway">SMS Gateway (Android device)</option>
                <option value="twilio">Twilio</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={sending || !apiKey}>
              {sending ? 'Sending…' : 'Send SMS'}
            </button>
            {!apiKey && <span className="inline-note" style={{ marginLeft: 10 }}>Add a sending API key above to enable sending.</span>}
          </form>
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ marginBottom: 12 }}>
            One message per line, formatted as <span className="mono">phone,message</span>. Split on the first comma only,
            so message text may contain commas.
          </p>
          <div className="field">
            <label htmlFor="bulk">Messages</label>
            <textarea
              id="bulk"
              className="textarea"
              style={{ minHeight: 160 }}
              placeholder={'+911234567890,Hello world\n+919876543210,Second message'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div className="segment-meter">
              <span>
                {bulkRows.length} row{bulkRows.length === 1 ? '' : 's'}
                {bulkRows.some((r) => r.error) && <span style={{ color: 'var(--red)' }}> · {bulkRows.filter((r) => r.error).length} invalid</span>}
              </span>
              <span>Priority {priority}</span>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="bulk-priority">Priority</label>
              <select
                id="bulk-priority"
                className="select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>
          {bulkRows.some((r) => r.error) && (
            <Alert kind="warning">
              {bulkRows
                .filter((r) => r.error)
                .slice(0, 3)
                .map((r, i) => (
                  <div key={i}>
                    Line {i + 1}: {r.error}
                  </div>
                ))}
            </Alert>
          )}
          {bulkError && <Alert kind="error">{bulkError}</Alert>}
          <button className="btn btn-primary" onClick={sendBulk} disabled={bulkSending || !apiKey || !bulkValid}>
            {bulkSending ? 'Sending…' : `Send ${bulkRows.length} message${bulkRows.length === 1 ? '' : 's'}`}
          </button>

          {bulkResults && (
            <div style={{ marginTop: 18 }}>
              <div className="card-title">
                Results · {bulkResults.messages.length} of {bulkResults.total}
              </div>
              {bulkResults.messages.map((r, i) => (
                <div className="result-row" key={i}>
                  <span className="mono faint">#{i + 1}</span>
                  {r.id && <span className="mono truncate" style={{ maxWidth: 280 }}>{r.id}</span>}
                  <span className="spacer" style={{ flex: 1 }} />
                  {r.status === 'FAILED' ? (
                    <span className="badge badge-red">
                      FAILED{r.error ? ` · ${r.error.code ?? ''} ${r.error.message ?? ''}` : ''}
                    </span>
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Key status</div>
        {apiKey ? (
          <p className="muted">
            Using {maskKey(apiKey)} · created keys are also listed on the <strong>API Keys</strong> page · last local save{' '}
            {formatDateTime(new Date().toISOString())}
          </p>
        ) : (
          <p className="faint">No sending key configured yet.</p>
        )}
      </div>
    </main>
  )
}
