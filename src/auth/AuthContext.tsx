import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, ApiError } from '../api/client'
import type { AuthResponse, User } from '../types'

const TOKEN_KEY = 'accessToken'
const USER_KEY = 'user'

interface AuthContextValue {
  user: User | null
  token: string | null
  booting: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: 'none',
    })
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setToken(res.accessToken)
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await apiRequest<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, ...(name ? { name } : {}) },
      auth: 'none',
    })
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setToken(res.accessToken)
    setUser(res.user)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => logout()
    window.addEventListener('sg:unauthorized', onUnauthorized)
    return () => window.removeEventListener('sg:unauthorized', onUnauthorized)
  }, [logout])

  useEffect(() => {
    if (!token) {
      setBooting(false)
      return
    }
    let cancelled = false
    const ctrl = new AbortController()
    apiRequest<User>('/api/v1/auth/me', { auth: 'jwt', signal: ctrl.signal })
      .then((me) => {
        if (cancelled) return
        setUser(me)
        localStorage.setItem(USER_KEY, JSON.stringify(me))
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) logout()
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [token, logout])

  const value = useMemo(
    () => ({ user, token, booting, login, register, logout }),
    [user, token, booting, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
