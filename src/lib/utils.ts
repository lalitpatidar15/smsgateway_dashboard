import type { Role } from '../types'

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const abs = Math.abs(diff)
  const suffix = diff >= 0 ? 'ago' : 'from now'
  const sec = Math.round(abs / 1000)
  if (sec < 60) return `${sec}s ${suffix}`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ${suffix}`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ${suffix}`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ${suffix}`
  return new Date(iso).toLocaleDateString()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatDuration(sec: number | undefined): string {
  if (sec === undefined || Number.isNaN(sec)) return '—'
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function canManage(role: Role | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

export function canDelete(role: Role | undefined): boolean {
  return role === 'SUPER_ADMIN'
}

const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM7_EXT = '^{}\\[~]|€'

export interface SegmentInfo {
  encoding: 'GSM-7' | 'UCS-2'
  units: number
  limit: number
  firstSegmentLimit: number
  subsequentSegmentLimit: number
  segments: number
}

export function analyzeSegments(text: string): SegmentInfo {
  if (text.length === 0) {
    return { encoding: 'GSM-7', units: 0, limit: 160, firstSegmentLimit: 160, subsequentSegmentLimit: 153, segments: 0 }
  }
  let gsm = true
  let units = 0
  for (const ch of text) {
    if (GSM7_BASIC.includes(ch)) units += 1
    else if (GSM7_EXT.includes(ch)) units += 2
    else {
      gsm = false
      break
    }
  }
  if (gsm) {
    const first = 160
    const next = 153
    const segments = units <= first ? 1 : Math.ceil(units / next)
    return {
      encoding: 'GSM-7',
      units,
      limit: first,
      firstSegmentLimit: first,
      subsequentSegmentLimit: next,
      segments,
    }
  }
  const units2 = [...text].length
  const first = 70
  const next = 67
  const segments = units2 <= first ? 1 : Math.ceil(units2 / next)
  return {
    encoding: 'UCS-2',
    units: units2,
    limit: first,
    firstSegmentLimit: first,
    subsequentSegmentLimit: next,
    segments,
  }
}

export function maskKey(key: string): string {
  if (key.length <= 14) return key
  return `${key.slice(0, 13)}${'•'.repeat(10)}${key.slice(-4)}`
}
