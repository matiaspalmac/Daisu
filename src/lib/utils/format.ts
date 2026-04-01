import { API_URL } from '@/lib/api/client'

export const resolveImageSrc = (src?: string) => {
  if (!src) return ''
  const trimmed = src.trim()
  if (!trimmed) return ''
  if (/^data:image\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('data:')) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!API_URL) return ''

  const baseUrl = API_URL.replace(/\/+$/, '')
  const path = trimmed.replace(/^\/+/, '')

  return `${baseUrl}/${path}`
}

/**
 * Simple heuristic language detection for instant feedback.
 */
export function detectLangHeuristic(text: string): string | null {
  const es = /(que|una|con|para|está|son|esto|pero|como|muy|bien|hola|gracias|español)/i
  const en = /(the|and|for|with|that|this|have|you|are|can|but|not|from|they)/i
  const pt = /(que|para|não|com|uma|isso|está|mais|como|obrigado|também)/i
  if (es.test(text)) return 'es'
  if (pt.test(text)) return 'pt'
  if (en.test(text)) return 'en'
  return null
}

/**
 * Relative time string (e.g., "5s", "2m", "3h", "1d")
 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}
