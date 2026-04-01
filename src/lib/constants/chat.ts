import type { FontSize, BubbleTheme } from '@/lib/types/chat'

export const LANG_FLAGS: Record<string, string> = { es: '\u{1F1EA}\u{1F1F8}', en: '\u{1F1EC}\u{1F1E7}', pt: '\u{1F1E7}\u{1F1F7}', '': '\u{1F4AC}' }

export const LEVEL_COLORS: Record<string, string> = {
  'A1-A2': '#10b981', 'A1': '#10b981', 'B1-B2': '#3b82f6', 'B1': '#3b82f6',
  'C1-C2': '#8b5cf6', 'C1': '#8b5cf6', 'B1-C1': '#6366f1'
}

export const EMOJI_REACTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F525}', '\u{1F64C}']

export const TARGET_LANG_CODES = ['es', 'en', 'pt'] as const

export const TARGET_LANG_FLAGS: Record<string, string> = { es: '\u{1F1EA}\u{1F1F8}', en: '\u{1F1EC}\u{1F1E7}', pt: '\u{1F1E7}\u{1F1F7}' }

export const BUBBLE_THEME_COLORS: Record<Exclude<BubbleTheme, 'custom'>, { mine: string; other: string }> = {
  neon: { mine: '#2563eb', other: '#1f2937' },
  pastel: { mine: '#7c3aed', other: '#f5f3ff' },
  minimal: { mine: '#111827', other: '#e5e7eb' },
}

export const FONT_SIZE_MAP: Record<FontSize, string> = { small: '13px', medium: '15px', large: '17px' }
export const FONT_AVATAR_SIZE: Record<FontSize, number> = { small: 28, medium: 34, large: 40 }

export const CUSTOM_BUBBLE_PRESETS: Array<{ id: string; mine: string; other: string }> = [
  { id: 'ocean', mine: '#2563eb', other: '#0f172a' },
  { id: 'violet', mine: '#7c3aed', other: '#312e81' },
  { id: 'sunset', mine: '#f97316', other: '#7c2d12' },
  { id: 'forest', mine: '#16a34a', other: '#14532d' },
  { id: 'rose', mine: '#e11d48', other: '#4c0519' },
  { id: 'slate', mine: '#334155', other: '#cbd5e1' },
]
