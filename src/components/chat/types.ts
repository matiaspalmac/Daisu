/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChatRoom {
  id: string
  name: string
  description?: string
  language?: string
  level?: string
  is_default?: number
  daily_prompt?: string
  type?: 'public' | 'private' | 'daily'
  userRole?: 'owner' | 'mod' | 'member' | null
}

export interface RoomMember {
  id: string | number
  name: string
  image?: string
  role: 'owner' | 'mod' | 'member'
}

export interface RoomInvite {
  id: string | number
  roomId: string
  roomName: string
  fromUserId: string | number
  fromName: string
  fromImage?: string
  createdAt?: string
}

export interface SearchableUser {
  id: string | number
  name: string
  image?: string
}

export interface OnlineUser {
  userId: string | number
  name: string
  image?: string
  targetLang?: string
}

export interface Reaction {
  emoji: string
  userId: string | number
  userImage?: string
  userName?: string
}

export interface PeerCorrection {
  id: string
  correctorId: string | number
  correctorName: string
  correctedText: string
  explanation?: string
  isHelpful?: boolean
  createdAt?: string
}

export interface Message {
  id: string
  content: string
  username: string
  roomId: string
  timestamp: string
  userImage?: string
  reactions?: Reaction[]
  detectedLang?: string
  senderId?: string | number
  sendStatus?: 'sending' | 'sent' | 'error'
  clientTempId?: string
  replyTo?: { id: string; username: string; content: string }
  editedAt?: string
  isDeleted?: boolean
  corrections?: PeerCorrection[]
}

export interface HistoryMessage {
  id: string
  content: string
  username: string
  roomId: string
  timestamp: string
  userImage?: string
  reactions?: Reaction[]
  senderId?: string | number
  detectedLang?: string
  replyTo?: { id: string; username: string; content: string }
  editedAt?: string
  isDeleted?: boolean
}

export interface MiniProfile {
  id: string | number
  name: string
  image?: string
  bio?: string
  nativelang?: string
  targetLang?: string
  level?: string
  country?: string
  interests?: string[]
}

export interface PrivateInvite {
  fromUserId: string | number
  fromName: string
}

export type FontSize = 'small' | 'medium' | 'large'
export type BubbleTheme = 'neon' | 'pastel' | 'minimal' | 'custom'

export interface MiniProfileFollowState {
  isFollowing: boolean
  followsYou: boolean
  followersCount: number
  followingCount: number
  loading: boolean
}

export const url_env = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

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
