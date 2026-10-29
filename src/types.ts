export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER'

export interface User {
  id: string
  email: string
  name: string | null
  role: Role
  isActive: boolean
  createdAt?: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface DashboardStats {
  gateways: { total: number; online: number; offline: number }
  sms: { today: number; queued: number; sent: number; delivered: number; failed: number }
}

export interface MetricRoute {
  route: string
  count: number
  errors: number
  avgMs: number
  maxMs: number
}

export interface MetricsSnapshot {
  uptimeSec: number
  totalRequests: number
  totalErrors: number
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number }
  routes: MetricRoute[]
}

export type SmsStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'CLAIMED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'EXPIRED'
  | 'CANCELLED'

export const SMS_STATUSES: SmsStatus[] = [
  'QUEUED',
  'SCHEDULED',
  'CLAIMED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'RETRYING',
  'EXPIRED',
  'CANCELLED',
]

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface SmsAttempt {
  id: string
  smsJobId: string
  gatewayDeviceId: string | null
  attemptNumber: number
  status: string
  errorCode: string | null
  errorMessage: string | null
  startedAt: string | null
  sentAt: string | null
  completedAt: string | null
}

export interface SmsJob {
  id: string
  recipient: string
  message: string
  status: SmsStatus
  priority: Priority
  attemptCount: number
  maxAttempts: number
  scheduledAt: string | null
  sentAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  segmentCount: number
  encoding: string
  gatewayDeviceId: string | null
  createdAt: string
  updatedAt: string
  attempts?: SmsAttempt[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paged<T> {
  data: T[]
  pagination: Pagination
}

export type GatewayStatus = 'ACTIVE' | 'OFFLINE' | 'DEGRADED' | 'PENDING' | 'DISABLED' | 'BLOCKED'

export interface SimSlot {
  id: string
  slotIndex?: number
  carrier?: string | null
  number?: string | null
  state?: string | null
  [k: string]: unknown
}

export interface Gateway {
  id: string
  name: string
  deviceId: string
  phoneNumber: string | null
  platform: string
  appVersion: string | null
  manufacturer: string | null
  model: string | null
  androidVersion: string | null
  status: GatewayStatus
  lastSeenAt: string | null
  battery: number | null
  charging: boolean | null
  network: string | null
  signalStrength: number | null
  simCount: number
  sims: SimSlot[]
  createdAt: string
  updatedAt: string
}

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED'

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  status: ApiKeyStatus
  permissions: string[]
  rateLimitPerMinute: number | null
  dailyLimit: number | null
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
  key?: string
}

export interface AuditLog {
  id: string
  actorType: string
  actorId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ip: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface HealthResponse {
  status: string
  timestamp: string
}

export interface SendResult {
  id?: string
  status: string
  error?: { code?: string; message?: string }
}

export interface BulkSendResponse {
  messages: SendResult[]
  total: number
}
