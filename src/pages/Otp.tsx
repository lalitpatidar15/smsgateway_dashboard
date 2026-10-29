import { useState, type FormEvent } from 'react'
import { apiRequest, errorMessage } from '../api/client'
import { Alert } from '../components/ui'
import { formatDateTime } from '../lib/utils'

interface OtpSessionInfo {
  id: string
  phone: string
  purpose: string
  status: string
  expiresAt: string | null
  verifiedAt: string | null
  attempts: number
}

interface OtpSendResponse {
  idempotent?: boolean
  session?: OtpSessionInfo
  id?: string
  sessionId?: string
  phone?: string
  purpose?: string
  status?: string
  expiresAt?: string | null
  jobId?: string
}

interface OtpVerifyResponse {
  verified: boolean
  code?: string
  message?: string
  sessionId?: string
}

export default function Otp() {
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('login')
  const [code, setCode] = useState('')
  const [ttlSeconds, setTtlSeconds] = useState('300')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<OtpSendResponse | null>(null)
  const [sendError, setSendError] = useState('')

  const [verifyPhone, setVerifyPhone] = useState('')
  const [verifyPurpose, setVerifyPurpose] = useState('login')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<OtpVerifyResponse | null>(null)
  const [verifyError, setVerifyError] = useState('')

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setSendError('')
    setSendResult(null)
    if (!phone.trim()) {
      setSendError('Phone number is required.')
      return
    }
    if (!purpose.trim()) {
      setSendError('Purpose is required.')
      return
    }
    setSending(true)
    try {
      const res = await apiRequest<OtpSendResponse>('/api/v1/otp/send', {
        method: 'POST',
        auth: 'jwt',
        body: {
          phone: phone.trim(),
          purpose: purpose.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
          ttlSeconds: Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 300,
        },
      })
      setSendResult(res)
    } catch (err) {
      setSendError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setVerifyError('')
    setVerifyResult(null)
    if (!verifyPhone.trim()) {
      setVerifyError('Phone number is required.')
      return
    }
    if (!verifyPurpose.trim()) {
      setVerifyError('Purpose is required.')
      return
    }
    if (!verifyCode.trim()) {
      setVerifyError('OTP code is required.')
      return
    }
    setVerifying(true)
    try {
      const res = await apiRequest<OtpVerifyResponse>('/api/v1/otp/verify', {
        method: 'POST',
        auth: 'jwt',
        body: { phone: verifyPhone.trim(), purpose: verifyPurpose.trim(), code: verifyCode.trim() },
      })
      setVerifyResult(res)
    } catch (err) {
      setVerifyError(errorMessage(err))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">OTP</h1>
          <p className="page-sub">Issue and verify SMS one-time passwords</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Send OTP</div>
        {sendError && <Alert kind="error">{sendError}</Alert>}
        {sendResult && (
          <Alert kind={sendResult.idempotent ? 'info' : 'success'}>
            {sendResult.idempotent
              ? `Idempotent — OTP already issued. Session ${sendResult.sessionId ?? ''} · status ${sendResult.status ?? ''}.`
              : `OTP sent via SMS job ${sendResult.jobId ?? sendResult.id ?? ''} · status ${sendResult.status ?? ''}`}
            {sendResult.expiresAt ? ` · expires ${formatDateTime(sendResult.expiresAt)}` : ''}
          </Alert>
        )}
        <form onSubmit={sendOtp}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="otp-phone">Phone</label>
              <input
                id="otp-phone"
                className="input mono"
                required
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="otp-purpose">Purpose</label>
              <input
                id="otp-purpose"
                className="input mono"
                required
                placeholder="login"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="otp-code">Code (optional — leave empty to generate)</label>
              <input
                id="otp-code"
                className="input mono"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <div className="field">
              <label htmlFor="otp-ttl">TTL seconds</label>
              <input
                id="otp-ttl"
                className="input mono"
                type="number"
                min={60}
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Verify OTP</div>
        {verifyError && <Alert kind="error">{verifyError}</Alert>}
        {verifyResult && (
          <Alert kind={verifyResult.verified ? 'success' : 'error'}>
            {verifyResult.verified ? 'OTP verified successfully.' : `Verification failed — ${verifyResult.code ?? ''} ${verifyResult.message ?? ''}`}
          </Alert>
        )}
        <form onSubmit={verifyOtp}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="otpv-phone">Phone</label>
              <input
                id="otpv-phone"
                className="input mono"
                required
                placeholder="+919876543210"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="otpv-purpose">Purpose</label>
              <input
                id="otpv-purpose"
                className="input mono"
                required
                placeholder="login"
                value={verifyPurpose}
                onChange={(e) => setVerifyPurpose(e.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="otpv-code">OTP code</label>
            <input
              id="otpv-code"
              className="input mono"
              required
              placeholder="123456"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify OTP'}
          </button>
        </form>
      </div>
    </main>
  )
}
