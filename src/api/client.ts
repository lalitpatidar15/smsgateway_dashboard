export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const DEFAULT_BASE_URL = 'http://localhost:3000'
const BASE_URL_KEY = 'sg_base_url'
const TOKEN_KEY = 'accessToken'
const TIMEOUT_MS = 20000

export function getBaseUrl(): string {
  const stored = localStorage.getItem(BASE_URL_KEY)
  return stored && stored.trim() ? stored.trim().replace(/\/+$/, '') : DEFAULT_BASE_URL
}

export function setBaseUrl(url: string): void {
  localStorage.setItem(BASE_URL_KEY, url.trim().replace(/\/+$/, ''))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

type AuthMode = 'none' | 'jwt' | 'apiKey'

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: AuthMode
  apiKey?: string
  query?: Record<string, string | number | undefined | null>
  signal?: AbortSignal
  timeoutMs?: number
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = getBaseUrl()
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${base}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function parseErrorBody(res: Response): Promise<ApiError> {
  let code = 'HTTP_' + res.status
  let message = res.statusText || 'Request failed'
  try {
    const data = await res.json()
    if (data && typeof data === 'object') {
      if (data.error && typeof data.error === 'object') {
        code = String(data.error.code ?? code)
        message = String(data.error.message ?? message)
      } else if (typeof data.message === 'string') {
        message = data.message
      }
    }
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, code, message)
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'jwt', apiKey, query, signal, timeoutMs = TIMEOUT_MS } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth === 'jwt') {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  } else if (auth === 'apiKey' && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onOuterAbort, { once: true })
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(0, 'TIMEOUT', 'Request timed out or was cancelled')
    }
    throw new ApiError(0, 'NETWORK_ERROR', err instanceof Error ? err.message : 'Network error')
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onOuterAbort)
  }

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const error = await parseErrorBody(res)
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('sg:unauthorized'))
    }
    throw error
  }

  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(res.status, 'BAD_JSON', 'Malformed JSON response')
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
