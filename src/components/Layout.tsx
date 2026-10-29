import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getBaseUrl, setBaseUrl } from '../api/client'
import { Alert } from './ui'

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/messages', label: 'Messages' },
  { to: '/send', label: 'Send' },
  { to: '/otp', label: 'OTP' },
  { to: '/gateways', label: 'Gateways' },
  { to: '/api-keys', label: 'API Keys' },
  { to: '/audit-logs', label: 'Audit Logs' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [baseUrl, setBaseUrlState] = useState(getBaseUrl())
  const [saved, setSaved] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!settingsOpen) return
    const onClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
        setSaved(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [settingsOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const saveSettings = () => {
    const trimmed = baseUrl.trim() || 'http://localhost:3000'
    setBaseUrlState(trimmed)
    setBaseUrl(trimmed)
    setSaved(true)
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="brand">
          <span className="brand-mark">SG</span>
          <span>SMS Gateway</span>
        </div>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-right" ref={settingsRef}>
          <div className="user-chip">
            <span className="u-email">{user?.email}</span>
            <span className="u-role">{user?.role}</span>
          </div>
          <button
            className="icon-btn"
            title="Settings"
            onClick={() => {
              setSettingsOpen((o) => !o)
              setSaved(false)
            }}
          >
            ⚙
          </button>
          <button className="icon-btn" title="Log out" onClick={handleLogout}>
            ⎋
          </button>
          {settingsOpen && (
            <div className="popover">
              <h4>API Base URL</h4>
              <div className="field">
                <input
                  className="input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrlState(e.target.value)}
                  placeholder="http://localhost:3000"
                  onKeyDown={(e) => e.key === 'Enter' && saveSettings()}
                />
              </div>
              <div className="top-actions">
                <button className="btn btn-primary btn-sm" onClick={saveSettings}>
                  Save
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setBaseUrlState('http://localhost:3000')
                  }}
                >
                  Reset
                </button>
              </div>
              {saved && <Alert kind="success">Saved. Requests will use the new base URL.</Alert>}
              <p className="inline-note">Stored in localStorage. Use when the backend runs on another host.</p>
            </div>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  )
}
