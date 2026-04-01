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
