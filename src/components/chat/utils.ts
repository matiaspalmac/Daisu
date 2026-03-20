import { url_env } from './types'

export const resolveImageSrc = (src?: string) => {
  if (!src) return ''
  const trimmed = src.trim()
  if (!trimmed) return ''
  if (/^data:image\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('data:')) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!url_env) return ''

  // Clean up any double slashes or missing slashes
  const baseUrl = url_env.replace(/\/+$/, '')
  const path = trimmed.replace(/^\/+/, '')

  // If the path already includes 'api/uploads', don't duplicate it
  return `${baseUrl}/${path}`
}

// Simple heuristic lang detection (front-end, for instant feedback)
export function detectLangHeuristic(text: string): string | null {
  const es = /(que|una|con|para|está|son|esto|pero|como|muy|bien|hola|gracias|español)/i
  const en = /(the|and|for|with|that|this|have|you|are|can|but|not|from|they)/i
  const pt = /(que|para|não|com|uma|isso|está|mais|como|obrigado|também)/i
  if (es.test(text)) return 'es'
  if (pt.test(text)) return 'pt'
  if (en.test(text)) return 'en'
  return null
}
