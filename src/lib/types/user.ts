export interface PresenceData {
  isOnline: boolean
  lastSeenAt: string | null
  currentRoomId?: string | null
}

export interface SearchUser {
  id: number
  name: string
  image?: string
  nativelang?: string
  learninglang?: string
  country?: string
  level?: string
}

export interface SearchRoom {
  id: number
  name: string
  language?: string
  members_count?: number
}

export interface SearchMessage {
  id: number
  content: string
  room_id: number
  room_name?: string
  author?: string
}

export interface SearchResults {
  users?: SearchUser[]
  rooms?: SearchRoom[]
  messages?: SearchMessage[]
}
