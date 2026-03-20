/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, Search, Plus, Loader2, Send, Hash, X,
  User as UserIcon, Smile, Flag, Users, ChevronDown, Menu, Settings, Reply, Bell, UserPlus,
  PenLine, ThumbsUp, Languages // eslint-disable-line
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useMessageTranslation } from '@/hooks/useMessageTranslation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { showToast as toast } from 'nextjs-toast-notify'
import { io, Socket } from 'socket.io-client'
import Image from 'next/image'
import RoomInviteModal from '@/components/chat/RoomInviteModal'
import RoomMembersPanel from '@/components/chat/RoomMembersPanel'
import RoomInvitationsPanel from '@/components/chat/RoomInvitationsPanel'

// ──── Types ────────────────────────────────────────────────────────────────
interface ChatRoom { id: string; name: string; description?: string; language?: string; level?: string; is_default?: number; daily_prompt?: string; }
interface OnlineUser { userId: string | number; name: string; image?: string; targetLang?: string; }
interface Reaction { emoji: string; userId: string | number; userImage?: string; userName?: string; }
interface PeerCorrection { id: string; correctorId: string | number; correctorName: string; correctedText: string; explanation?: string; isHelpful?: boolean; createdAt?: string }
interface Message { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; detectedLang?: string; senderId?: string | number; sendStatus?: 'sending' | 'sent' | 'error'; clientTempId?: string; replyTo?: { id: string; username: string; content: string }; isDeleted?: boolean; corrections?: PeerCorrection[] }
interface MiniProfile { id: string | number; name: string; image?: string; bio?: string; nativelang?: string; targetLang?: string; level?: string; country?: string; interests?: string[]; }
interface HistoryMessage { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; senderId?: string | number; detectedLang?: string; replyTo?: { id: string; username: string; content: string } }
interface PrivateInvite { fromUserId: string | number; fromName: string }
interface RoomInvite { id: string | number; roomId: string; roomName: string; fromUserId: string | number; fromName: string; fromImage?: string; createdAt?: string }

type FontSize = 'small' | 'medium' | 'large'
type BubbleTheme = 'neon' | 'pastel' | 'minimal' | 'custom'

const url_env = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

const resolveImageSrc = (src?: string) => {
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

const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷', '': '💬' }
const LEVEL_COLORS: Record<string, string> = {
  'A1-A2': '#10b981', 'A1': '#10b981', 'B1-B2': '#3b82f6', 'B1': '#3b82f6',
  'C1-C2': '#8b5cf6', 'C1': '#8b5cf6', 'B1-C1': '#6366f1'
}
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '🙌']
const TARGET_LANG_CODES = ['es', 'en', 'pt'] as const
const TARGET_LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' }
const BUBBLE_THEME_COLORS: Record<Exclude<BubbleTheme, 'custom'>, { mine: string; other: string }> = {
  neon: { mine: '#2563eb', other: '#1f2937' },
  pastel: { mine: '#7c3aed', other: '#f5f3ff' },
  minimal: { mine: '#111827', other: '#e5e7eb' },
}
const FONT_SIZE_MAP: Record<FontSize, string> = { small: '13px', medium: '15px', large: '17px' }
const FONT_AVATAR_SIZE: Record<FontSize, number> = { small: 28, medium: 34, large: 40 }
const CUSTOM_BUBBLE_PRESETS: Array<{ id: string; mine: string; other: string }> = [
  { id: 'ocean', mine: '#2563eb', other: '#0f172a' },
  { id: 'violet', mine: '#7c3aed', other: '#312e81' },
  { id: 'sunset', mine: '#f97316', other: '#7c2d12' },
  { id: 'forest', mine: '#16a34a', other: '#14532d' },
  { id: 'rose', mine: '#e11d48', other: '#4c0519' },
  { id: 'slate', mine: '#334155', other: '#cbd5e1' },
]

// Simple heuristic lang detection (front-end, for instant feedback)
function detectLangHeuristic(text: string): string | null {
  const es = /(que|una|con|para|está|son|esto|pero|como|muy|bien|hola|gracias|español)/i
  const en = /(the|and|for|with|that|this|have|you|are|can|but|not|from|they)/i
  const pt = /(que|para|não|com|uma|isso|está|mais|como|obrigado|também)/i
  if (es.test(text)) return 'es'
  if (pt.test(text)) return 'pt'
  if (en.test(text)) return 'en'
  return null
}

// ──── Main Component ────────────────────────────────────────────────────────
// ---- Inline Translation Sub-component ----
function MessageTranslateButton({ text, nativeLang, chatFontSize }: { text: string; nativeLang: string; chatFontSize: string }) {
  const t = useTranslations('ChatPage')
  const { state, translate, toggleVisible } = useMessageTranslation(nativeLang)
  return (
    <>
      <button
        onClick={() => state.status === 'done' ? toggleVisible() : translate(text)}
        disabled={state.status === 'loading'}
        className="mt-1 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
        style={{
          background: state.status === 'done' ? 'var(--primary)' : 'var(--surface2)',
          color: state.status === 'done' ? '#fff' : 'var(--text3)',
          border: '1px solid var(--border)',
          opacity: state.status === 'loading' ? 0.5 : 1,
          cursor: state.status === 'loading' ? 'wait' : 'pointer',
        }}
        title={t('actions.translateTitle')}
      >
        <Languages size={11} />
        <span className="ml-1">{state.status === 'done' ? (state.visible ? t('translation.hide') : t('translation.show')) : t('actions.translate')}</span>
      </button>
      {state.status === 'loading' && (
        <div className="mt-1 px-3 py-1.5 rounded-xl text-xs italic"
          style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
          {t('translation.loading')}
        </div>
      )}
      {state.status === 'done' && state.visible && (
        <div className="mt-1 px-3 py-2 rounded-xl w-full"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
            {t('translation.label', { lang: state.result.to.toUpperCase() })}
          </span>
          <p className="text-sm break-words mt-1" style={{ color: 'var(--text)', fontSize: chatFontSize }}>{state.result.translated_text}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>
            {state.result.usage.limit === null
              ? t('translation.usageUnlimited')
              : t('translation.usage', { used: state.result.usage.used, limit: state.result.usage.limit })}
          </p>
        </div>
      )}
      {state.status === 'limit_reached' && (
        <div className="mt-1 px-3 py-1.5 rounded-xl text-xs"
          style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444' }}>
          {t('translation.limitReached')}
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-1 px-3 py-1.5 rounded-xl text-xs"
          style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#f59e0b' }}>
          {t('translation.error')}
        </div>
      )}
    </>
  )
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const t = useTranslations('ChatPage')
  const [isAdminOverride, setIsAdminOverride] = useState(false)

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [filteredLang, setFilteredLang] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [roomDrafts, setRoomDrafts] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [dailyPrompt, setDailyPrompt] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null) // messageId
  const [miniProfile, setMiniProfile] = useState<MiniProfile | null>(null)
  const [showReport, setShowReport] = useState<string | null>(null) // messageId
  const [reportReason, setReportReason] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [currentUserAvatar, setCurrentUserAvatar] = useState('')
  const [incomingPrivateInvite, setIncomingPrivateInvite] = useState<PrivateInvite | null>(null)
  const [pendingPrivateRoom, setPendingPrivateRoom] = useState<ChatRoom | null>(null)
  const [showChatSettings, setShowChatSettings] = useState(false)
  const [bubbleTheme, setBubbleTheme] = useState<BubbleTheme>('neon')
  const [myBubbleColor, setMyBubbleColor] = useState('#2d88ff')
  const [otherBubbleColor, setOtherBubbleColor] = useState('#1e2430')
  const [myBubbleDraft, setMyBubbleDraft] = useState('#2d88ff')
  const [otherBubbleDraft, setOtherBubbleDraft] = useState('#1e2430')
  const [fontSize, setFontSize] = useState<FontSize>('large')
  const [effectsEnabled, setEffectsEnabled] = useState(true)
  const [textOnlyMode, setTextOnlyMode] = useState(false)
  const [dataSaverMode, setDataSaverMode] = useState(false)
  const [disableProfileImages, setDisableProfileImages] = useState(false)
  const [roomBackgrounds, setRoomBackgrounds] = useState<Record<string, string>>({})
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string; preview: string } | null>(null)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const [moderationMap, setModerationMap] = useState<Record<string, { muted: boolean; blocked: boolean }>>({})
  const [preferredRoomId, setPreferredRoomId] = useState('')
  // Language selector overlay (shown on first room join)
  const [showLangSelector, setShowLangSelector] = useState(false)
  const [targetLang, setTargetLang] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('daisu-targetLang') || ''
    return ''
  })

  // Consecutive native-lang counter
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)
  const historyReadyRef = useRef(false)
  const pendingMessagesRef = useRef<Message[]>([])
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const privateInviteCooldownRef = useRef<Map<string, number>>(new Map())
  const touchStartXRef = useRef<number | null>(null)
  const saveSettingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSettingsPayloadRef = useRef('')
  const hasLoadedServerSettingsRef = useRef(false)
  const loadingOlderRef = useRef(false)
  const userMetaCacheRef = useRef<{ userId?: string; ts: number; image: string; isAdmin: boolean }>({ ts: 0, image: '', isAdmin: false })
  const [roomBgDraft, setRoomBgDraft] = useState('')

  // NEW: Mentions, Roles, Bans, Emojis
  const [mentionInput, setMentionInput] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})
  const [emojiRecents, setEmojiRecents] = useState<string[]>(['👍', '❤️', '😂', '👏', '🔥', '😮', '💯', '✨', '🎉', '😢'])
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null)
  const [activeReaction, setActiveReaction] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [miniProfileFollow, setMiniProfileFollow] = useState<{ isFollowing: boolean; followsYou: boolean; followersCount: number; followingCount: number; loading: boolean }>({
    isFollowing: false,
    followsYou: false,
    followersCount: 0,
    followingCount: 0,
    loading: false,
  })

  // Peer corrections
  const [showSubmitCorrection, setShowSubmitCorrection] = useState<string | null>(null)
  const [showViewCorrections, setShowViewCorrections] = useState<string | null>(null)
  const [correctionDraft, setCorrectionDraft] = useState('')
  const [correctionExplanation, setCorrectionExplanation] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [viewCorrectionsList, setViewCorrectionsList] = useState<PeerCorrection[]>([])
  const [viewCorrectionsLoading, setViewCorrectionsLoading] = useState(false)
  const [correctionHelpfulLoading, setCorrectionHelpfulLoading] = useState<string | null>(null)

  // Room invitations & membership (TAREA 17)
  const [pendingInvitations, setPendingInvitations] = useState<RoomInvite[]>([])
  const [showInvitationsPanel, setShowInvitationsPanel] = useState(false)
  const [showRoomInviteModal, setShowRoomInviteModal] = useState(false)
  const [showRoomMembersPanel, setShowRoomMembersPanel] = useState(false)
  const [roomMembership, setRoomMembership] = useState<Record<string, 'owner' | 'mod' | 'member' | null>>({})
  const [joiningRoom, setJoiningRoom] = useState(false)
  const [leavingRoom, setLeavingRoom] = useState(false)

  const preventMediaActions = (e: React.SyntheticEvent) => e.preventDefault()

  // Fetch pending invitations (poll every 30s)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.accessToken) return
    const token = session.user.accessToken as string
    const fetchInvitations = async () => {
      try {
        const res = await apiFetch('/api/invites', { method: 'GET', token })
        const data = await res.json()
        if (Array.isArray(data)) setPendingInvitations(data as RoomInvite[])
      } catch { /* silent */ }
    }
    fetchInvitations()
    const interval = setInterval(fetchInvitations, 30000)
    return () => clearInterval(interval)
  }, [status, session?.user?.accessToken])

  // Fetch room membership when selectedRoom changes
  useEffect(() => {
    if (!selectedRoom || status !== 'authenticated' || !session?.user?.accessToken) return
    const token = session.user.accessToken as string
    const roomId = selectedRoom.id
    if (roomMembership[roomId] !== undefined) return
    apiFetch('/api/rooms/' + roomId + '/members', { method: 'GET', token }).then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) {
          const me = data.find((m: any) => String(m.id) === String(session?.user?.id))
          setRoomMembership(prev => ({ ...prev, [roomId]: me ? me.role : null }))
        }
      })
      .catch(() => setRoomMembership(prev => ({ ...prev, [roomId]: null })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, status, session?.user?.accessToken])

  // Derived membership values
  const currentRoomRole = selectedRoom ? (roomMembership[selectedRoom.id] ?? null) : null
  const isMemberOfRoom = currentRoomRole !== null
  const isModOrOwner = currentRoomRole === 'mod' || currentRoomRole === 'owner'
  const isPrivateRoom = (selectedRoom as any)?.type === 'private'
  const isPublicRoom = selectedRoom && !isPrivateRoom && !String(selectedRoom.id).startsWith('private-')

  const handleJoinRoom = useCallback(async () => {
    if (!selectedRoom || !session?.user?.accessToken) return
    setJoiningRoom(true)
    try {
      await apiFetch('/api/rooms/' + selectedRoom.id + '/join', { method: 'POST', token: session.user.accessToken as string })
      setRoomMembership(prev => ({ ...prev, [selectedRoom.id]: 'member' }))
      toast.success(t('toast.roomJoined'))
    } catch { toast.error('Error') }
    finally { setJoiningRoom(false) }
  }, [selectedRoom, session?.user?.accessToken, t])

  const handleLeaveRoom = useCallback(async () => {
    if (!selectedRoom || !session?.user?.accessToken) return
    setLeavingRoom(true)
    try {
      await apiFetch('/api/rooms/' + selectedRoom.id + '/leave', { method: 'POST', token: session.user.accessToken as string })
      setRoomMembership(prev => ({ ...prev, [selectedRoom.id]: null }))
      toast.success(t('toast.roomLeft'))
    } catch { toast.error('Error') }
    finally { setLeavingRoom(false) }
  }, [selectedRoom, session?.user?.accessToken, t])

  const handleAcceptInvitation = useCallback(async (invite: RoomInvite) => {
    if (!session?.user?.accessToken) return
    try {
      await apiFetch('/api/invites/' + invite.id + '/accept', { method: 'POST', token: session.user.accessToken as string })
      setPendingInvitations(prev => prev.filter(i => i.id !== invite.id))
      setRoomMembership(prev => ({ ...prev, [invite.roomId]: 'member' }))
      toast.success(t('toast.inviteAccepted'))
    } catch { toast.error('Error') }
  }, [session?.user?.accessToken, t])

  const handleDeclineInvitation = useCallback(async (inviteId: string | number) => {
    if (!session?.user?.accessToken) return
    try {
      await apiFetch('/api/invites/' + inviteId + '/decline', { method: 'POST', token: session.user.accessToken as string })
      setPendingInvitations(prev => prev.filter(i => i.id !== inviteId))
      toast.success(t('toast.inviteDeclined'))
    } catch { toast.error('Error') }
  }, [session?.user?.accessToken, t])

  const currentBubbleColors = bubbleTheme === 'custom'
    ? { mine: myBubbleColor, other: otherBubbleColor }
    : BUBBLE_THEME_COLORS[bubbleTheme]
  const chatFontSize = FONT_SIZE_MAP[fontSize]
  const chatAvatarSize = FONT_AVATAR_SIZE[fontSize]
  const shouldLoadImages = !textOnlyMode && !disableProfileImages && !dataSaverMode

  const getUserKey = useCallback((senderId?: string | number, username?: string) => {
    if (senderId !== undefined && senderId !== null) return `id:${String(senderId)}`
    return `name:${username || ''}`
  }, [])

  const getDisplayName = useCallback((senderId?: string | number, username?: string) => {
    const key = getUserKey(senderId, username)
    return nicknames[key] || username || t('common.user')
  }, [getUserKey, nicknames, t])

  const getModeration = useCallback((senderId?: string | number) => {
    if (senderId === undefined || senderId === null) return { muted: false, blocked: false }
    return moderationMap[String(senderId)] || { muted: false, blocked: false }
  }, [moderationMap])

  const isBlockedUser = useCallback((senderId?: string | number) => getModeration(senderId).blocked, [getModeration])
  const isMutedUser = useCallback((senderId?: string | number) => getModeration(senderId).muted, [getModeration])

  const scrollChatToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
  }

  const isCurrentUserMessage = useCallback((senderId?: string | number, username?: string) => {
    const me = session?.user?.id
    if (senderId !== undefined && senderId !== null && me !== undefined && me !== null) {
      return String(senderId) === String(me)
    }
    return Boolean(username && username === session?.user?.name)
  }, [session])

  const buildPrivateRoom = useCallback((otherUserId: string | number, otherUserName: string): ChatRoom => {
    const me = String(session?.user?.id || '')
    const other = String(otherUserId)
    const [a, b] = [me, other].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }))
    return {
      id: `private-${a}-${b}`,
      name: t('privateInvite.roomName', { name: otherUserName }),
      description: t('privateInvite.privateChatDescription'),
      language: selectedRoom?.language || '',
      level: selectedRoom?.level || '',
    }
  }, [session?.user?.id, selectedRoom?.language, selectedRoom?.level, t])

  useEffect(() => {
    setIsAdminOverride(Boolean(session?.user?.isAdmin))
  }, [session?.user?.isAdmin])

  useEffect(() => {
    let cancelled = false
    if (status !== 'authenticated' || !session?.user?.id) {
      setCurrentUserAvatar('')
      return
    }

    if (!shouldLoadImages) {
      setCurrentUserAvatar('')
      return
    }

    const userId = String(session.user.id)
    const now = Date.now()
    const cacheTtlMs = 2 * 60 * 1000
    const fromSession = resolveImageSrc(session?.user?.image || '')

    const cachedRef = userMetaCacheRef.current
    const hasFreshRefCache = cachedRef.userId === userId && (now - cachedRef.ts) < cacheTtlMs
    if (hasFreshRefCache) {
      if (!fromSession && cachedRef.image) {
        setCurrentUserAvatar(cachedRef.image)
      } else if (fromSession) {
        setCurrentUserAvatar(fromSession)
      }
      setIsAdminOverride(Boolean(cachedRef.isAdmin || session?.user?.isAdmin))
      return
    }

    const metaCacheKey = `daisu-user-meta-${userId}`
    try {
      const cachedRaw = sessionStorage.getItem(metaCacheKey)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw)
        if (cached?.ts && (now - Number(cached.ts)) < cacheTtlMs) {
          const cachedImage = resolveImageSrc(cached?.image || '')
          if (!fromSession && cachedImage) setCurrentUserAvatar(cachedImage)
          else if (fromSession) setCurrentUserAvatar(fromSession)
          if (typeof cached?.isAdmin === 'boolean') setIsAdminOverride(cached.isAdmin)
          userMetaCacheRef.current = { userId, ts: now, image: cachedImage || fromSession || '', isAdmin: Boolean(cached?.isAdmin) }
          return
        }
      }
    } catch { }

    if (fromSession) {
      setCurrentUserAvatar(fromSession)
      if (typeof session?.user?.isAdmin === 'boolean') {
        setIsAdminOverride(Boolean(session.user.isAdmin))
        userMetaCacheRef.current = { userId, ts: now, image: fromSession, isAdmin: Boolean(session.user.isAdmin) }
        try {
          sessionStorage.setItem(metaCacheKey, JSON.stringify({ ts: now, image: fromSession, isAdmin: Boolean(session.user.isAdmin) }))
        } catch { }
        return
      }
    }

    apiFetch(`/api/users/${session.user.id}`)
      .then(r => r.json())
      .then((u) => {
        if (cancelled) return
        const resolvedImage = resolveImageSrc(u?.image || '')
        const adminValue = Boolean(u?.isAdmin)
        setCurrentUserAvatar(fromSession || resolvedImage)
        setIsAdminOverride(adminValue)
        userMetaCacheRef.current = { userId, ts: Date.now(), image: resolvedImage || fromSession || '', isAdmin: adminValue }
        try {
          sessionStorage.setItem(metaCacheKey, JSON.stringify({ ts: Date.now(), image: resolvedImage || '', isAdmin: adminValue }))
        } catch { }
      })
      .catch(() => {
        if (!cancelled) setCurrentUserAvatar('')
      })

    return () => { cancelled = true }
  }, [status, session?.user?.id, session?.user?.image, session?.user?.isAdmin, shouldLoadImages])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    let cancelled = false

    apiFetch(`/api/users/${session.user.id}/chat-settings`)
      .then(r => r.json())
      .then((settings) => {
        if (cancelled || !settings) return
        if (settings.bubbleTheme) setBubbleTheme(settings.bubbleTheme)
        if (settings.myBubbleColor) setMyBubbleColor(settings.myBubbleColor)
        if (settings.otherBubbleColor) setOtherBubbleColor(settings.otherBubbleColor)
        if (settings.fontSize) setFontSize(settings.fontSize)
        if (typeof settings.effectsEnabled === 'boolean') setEffectsEnabled(settings.effectsEnabled)
        if (typeof settings.textOnlyMode === 'boolean') setTextOnlyMode(settings.textOnlyMode)
        if (typeof settings.dataSaverMode === 'boolean') setDataSaverMode(settings.dataSaverMode)
        if (typeof settings.disableProfileImages === 'boolean') setDisableProfileImages(settings.disableProfileImages)
        if (settings.roomBackgrounds && typeof settings.roomBackgrounds === 'object') setRoomBackgrounds(settings.roomBackgrounds)
        if (settings.nicknames && typeof settings.nicknames === 'object') setNicknames(settings.nicknames)
        if (settings.lastRoomId) setPreferredRoomId(String(settings.lastRoomId))
        if (settings.roomDrafts && typeof settings.roomDrafts === 'object') setRoomDrafts(settings.roomDrafts)
        hasLoadedServerSettingsRef.current = true
      })
      .catch(() => {
        hasLoadedServerSettingsRef.current = true
      })

    return () => { cancelled = true }
  }, [status, session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id || !hasLoadedServerSettingsRef.current) return
    if (saveSettingsTimeoutRef.current) clearTimeout(saveSettingsTimeoutRef.current)

    saveSettingsTimeoutRef.current = setTimeout(() => {
      const payloadObj = {
        bubbleTheme,
        myBubbleColor,
        otherBubbleColor,
        fontSize,
        effectsEnabled,
        textOnlyMode,
        dataSaverMode,
        disableProfileImages,
        roomBackgrounds,
        nicknames,
        lastRoomId: selectedRoom?.id || '',
        roomDrafts,
      }
      const payload = JSON.stringify(payloadObj)
      if (payload === lastSettingsPayloadRef.current) return
      lastSettingsPayloadRef.current = payload

      apiFetch(`/api/users/${session.user.id}/chat-settings`, {
        method: 'PUT',
        body: payload,
      }).catch(() => { })
    }, 1200)

    return () => {
      if (saveSettingsTimeoutRef.current) clearTimeout(saveSettingsTimeoutRef.current)
    }
  }, [session?.user?.id, bubbleTheme, myBubbleColor, otherBubbleColor, fontSize, effectsEnabled, textOnlyMode, dataSaverMode, disableProfileImages, roomBackgrounds, nicknames, selectedRoom?.id, roomDrafts])

  useEffect(() => {
    if (!showChatSettings) return
    setMyBubbleDraft(myBubbleColor)
    setOtherBubbleDraft(otherBubbleColor)
  }, [showChatSettings, myBubbleColor, otherBubbleColor])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    apiFetch(`/api/users/${session.user.id}/moderation`)
      .then(r => r.json())
      .then((data) => {
        if (data?.entries && typeof data.entries === 'object') {
          setModerationMap(data.entries)
        }
      })
      .catch(() => { })
  }, [status, session?.user?.id])

  useEffect(() => {
    setRoomBgDraft(selectedRoom ? (roomBackgrounds[selectedRoom.id] || '') : '')
  }, [selectedRoom, roomBackgrounds])

  // ── Fetch rooms ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return
    setIsLoadingRooms(true)
    apiFetch(`/api/rooms`)
      .then(r => r.json()).then(d => Array.isArray(d) && setRooms(d))
      .catch(() => { }).finally(() => setIsLoadingRooms(false))
  }, [status])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen' || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's')) {
        toast.error(t('toast.screenshotsDisabled'))
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [t])

  // ── Connect socket when joining room ─────────────────────────────────────
  const joinRoom = useCallback((room: ChatRoom) => {
    if (selectedRoom?.id === room.id) { setSidebarOpen(false); return }
    setSelectedRoom(room)
    setMessages([])
    setHistoryOffset(0)
    setHasOlderMessages(true)
    setOnlineUsers([])
    setTypingUsers(new Map())
    setDailyPrompt('')
    isInitialLoad.current = true
    historyReadyRef.current = false
    pendingMessagesRef.current = []
    setIsLoadingMessages(true)
    setSidebarOpen(false)
    setInputValue(roomDrafts[room.id] || '')

    socketRef.current?.disconnect()
    const s = io(`${url_env}`, {
      path: '/api/socket',
      auth: { username: session?.user?.name, userId: session?.user?.id, serverOffset: 0 },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = s

    s.on('connect', () => {
      setIsReconnecting(false)
      s.emit('join room', room.id)
    })
    s.on('reconnect_attempt', () => setIsReconnecting(true))

    s.on('chat-history', (history: HistoryMessage[]) => {
      const normalized = Array.isArray(history)
        ? history.map(m => ({
          id: String(m.id),
          content: m.content,
          username: m.username,
          roomId: String(m.roomId),
          timestamp: m.timestamp,
          userImage: m.userImage || '',
          reactions: m.reactions || [],
          senderId: m.senderId,
          detectedLang: m.detectedLang || undefined,
          replyTo: m.replyTo
            ? {
              id: String(m.replyTo.id),
              username: m.replyTo.username || m.username,
              content: m.replyTo.content || '',
            }
            : undefined,
        }))
        : []

      const filtered = normalized.filter(m => !isBlockedUser(m.senderId))

      historyReadyRef.current = true
      setMessages(prev => {
        const byId = new Map<string, Message>()
        for (const m of filtered) byId.set(m.id, m)
        for (const m of pendingMessagesRef.current) if (!byId.has(m.id)) byId.set(m.id, m)
        pendingMessagesRef.current = []
        return Array.from(byId.values())
      })
      setHistoryOffset(filtered.length)
      setHasOlderMessages(filtered.length > 0)
      setIsLoadingMessages(false)
      setHasNewMessages(false)
    })

    const historyFallbackTimer = setTimeout(async () => {
      if (historyReadyRef.current) return
      try {
        const historyLimit = 30
        const blockedIds = Object.entries(moderationMap).filter(([, v]) => v.blocked).map(([k]) => k)
        const excludeUserIds = blockedIds.join(',')
        const r = await apiFetch(`/api/chats?room_id=${room.id}&limit=${historyLimit}${excludeUserIds ? `&excludeUserIds=${encodeURIComponent(excludeUserIds)}` : ''}`)
        const rows = await r.json()
        const normalized: Message[] = Array.isArray(rows)
          ? rows.slice().reverse().map((m: any) => ({
            id: String(m.id),
            content: m.content,
            username: m.user?.name || 'unknown',
            roomId: String(m.room?.id || room.id),
            timestamp: m.sent_at,
            userImage: m.user?.image || '',
            reactions: [],
            senderId: m.user?.id,
            detectedLang: undefined,
            replyTo: m.replyTo
              ? {
                id: String(m.replyTo.id),
                username: m.replyTo.username || (m.user?.name || 'unknown'),
                content: m.replyTo.content || '',
              }
              : undefined,
          }))
          : []

        historyReadyRef.current = true
        setMessages(prev => {
          const byId = new Map<string, Message>()
          for (const m of normalized) byId.set(m.id, m)
          for (const m of pendingMessagesRef.current) if (!byId.has(m.id)) byId.set(m.id, m)
          pendingMessagesRef.current = []
          return Array.from(byId.values())
        })
        setHistoryOffset(normalized.length)
        setHasOlderMessages(normalized.length > 0)
      } catch {
      } finally {
        setIsLoadingMessages(false)
      }
    }, 900)

    s.on('chat message', (msg: string, id: string, username: string, roomId: string, timestamp: string, userImage: string, reactions: Reaction[], senderId?: string | number, detectedLangFromServer?: string, replyToMeta?: { id?: string; username?: string; content?: string }, clientTempId?: string) => {
      if (isBlockedUser(senderId)) return
      const detectedLang = detectedLangFromServer || detectLangHeuristic(msg) || undefined
      const incoming: Message = {
        id,
        content: msg,
        username,
        roomId,
        timestamp,
        userImage,
        reactions: reactions || [],
        detectedLang,
        senderId,
        sendStatus: 'sent',
        clientTempId,
        replyTo: replyToMeta?.id
          ? {
            id: String(replyToMeta.id),
            username: replyToMeta.username || username,
            content: replyToMeta.content || '',
          }
          : undefined,
      }

      if (!historyReadyRef.current) {
        pendingMessagesRef.current.push(incoming)
        return
      }

      setIsLoadingMessages(false)
      setMessages(prev => {
        if (prev.some(m => m.id === id)) return prev
        if (clientTempId) {
          const replaced = prev.map(m => m.clientTempId === clientTempId ? { ...incoming, replyTo: incoming.replyTo || m.replyTo } : m)
          if (replaced.some(m => m.id === id)) return replaced
          return replaced
        }
        const isMine = isCurrentUserMessage(senderId, username)
        // New message indicator when not at bottom
        if (!isAtBottom && !isMine && !isMutedUser(senderId)) setHasNewMessages(true)
        return [...prev, incoming]
      })
    })

    s.on('online-users', (users: OnlineUser[]) => setOnlineUsers(users))
    s.on('user-joined', (user: OnlineUser) => {
      setOnlineUsers(p => p.some(u => String(u.userId) === String(user.userId)) ? p : [...p, user])
    })
    s.on('user-left', ({ userId }: { userId: string | number }) => {
      setOnlineUsers(p => p.filter(u => String(u.userId) !== String(userId)))
    })
    s.on('user-typing', ({ userId, name }: { userId?: string | number; name?: string }) => {
      if (isMutedUser(userId) || isBlockedUser(userId)) return
      const meId = session?.user?.id
      const meName = session?.user?.name
      if ((userId !== undefined && meId !== undefined && String(userId) === String(meId)) || (name && meName && name === meName)) {
        return
      }

      setTypingUsers(prev => {
        const next = new Map(prev)
        const key = userId !== undefined && userId !== null ? String(userId) : `name:${name || ''}`
        next.set(key, name || '...')
        return next
      })
    })
    s.on('user-stop-typing', ({ userId, name }: { userId?: string | number; name?: string }) => {
      setTypingUsers(prev => {
        const next = new Map(prev)

        if (userId !== undefined && userId !== null) {
          next.delete(String(userId))
        }

        if (name) {
          for (const [key, value] of next.entries()) {
            if (value === name || key === `name:${name}`) {
              next.delete(key)
            }
          }
        }

        return next
      })
    })
    s.on('daily-prompt', (prompt: string) => setDailyPrompt(prompt))
    s.on('reaction-update', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages(p => p.map(m => m.id === String(messageId) ? { ...m, reactions } : m))
    })
    s.on('private-chat-invite', ({ fromUserId, fromName }: { fromUserId: string | number; fromName: string }) => {
      if (!fromUserId || String(fromUserId) === String(session?.user?.id)) return
      setIncomingPrivateInvite({ fromUserId, fromName })
    })
    s.on('private-chat-invite-response', ({ fromUserId, fromName, accepted }: { fromUserId: string | number; fromName: string; accepted: boolean }) => {
      if (!fromUserId) return
      if (accepted) {
        const room = buildPrivateRoom(fromUserId, fromName || t('common.user'))
        setRooms(prev => prev.some(r => r.id === room.id) ? prev : [room, ...prev])
        setPendingPrivateRoom(room)
        toast.success(t('privateInvite.accepted', { name: fromName || t('common.user') }))
        return
      }

      if (!isAdminOverride) {
        const fifteenMinutes = 15 * 60 * 1000
        privateInviteCooldownRef.current.set(String(fromUserId), Date.now() + fifteenMinutes)
      }
      toast.error(t('privateInvite.rejected', { name: fromName || t('common.user') }))
    })
    s.on('private-chat-invite-sent', ({ delivered }: { delivered: boolean }) => {
      if (!delivered) {
        toast.error(t('privateInvite.userOffline'))
      }
    })
    s.on('private-chat-invite-error', ({ reason, retryAfterMs }: { reason?: string; retryAfterMs?: number }) => {
      if (reason === 'cooldown') {
        const leftMin = Math.max(1, Math.ceil((retryAfterMs || 0) / 60000))
        toast.error(t('privateInvite.cooldown', { minutes: leftMin }))
        return
      }
      if (reason === 'blocked') {
        toast.error(t('privateInvite.blocked'))
        return
      }
      toast.error(t('privateInvite.sendError'))
    })

    // NEW: Socket listeners for new features
    s.on('user-banned', ({ userId, reason, isPermanent, expiresAt }: any) => {
      toast.error(reason ? t('toast.userBannedWithReason', { reason }) : t('toast.userBanned'))
    })
    s.on('you-were-banned', ({ roomId: banRoomId, reason }: any) => {
      if (String(banRoomId) === String(selectedRoom?.id)) {
        toast.error(t('toast.youWereBanned', { reason: reason || t('toast.noReason') }))
        if (selectedRoom) {
          setRooms(prev => prev.filter(r => r.id !== selectedRoom.id))
          setSelectedRoom(null)
        }
      }
    })
    s.on('user-unbanned', ({ userId }: any) => {
      toast.success(t('toast.userUnbanned'))
    })
    s.on('you-were-mentioned', ({ messageId, roomId: mentionRoomId, mentionedBy: mentionedByName }: any) => {
      toast.success(t('toast.userMentionedYou', { name: mentionedByName }))
      if (String(mentionRoomId) === String(selectedRoom?.id)) {
        void triggerConfetti(window.innerWidth / 2, 100)
      }
    })

    s.on('peer-correction', ({ messageId, correctorId, correctorName, correctedText, explanation, correctionId }: any) => {
      const correction: PeerCorrection = {
        id: String(correctionId || Date.now()),
        correctorId,
        correctorName,
        correctedText,
        explanation: explanation || undefined,
        isHelpful: false,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => prev.map(m =>
        String(m.id) === String(messageId)
          ? { ...m, corrections: [...(m.corrections || []).filter(c => c.id !== correction.id), correction] }
          : m
      ))
    })

    s.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') setIsReconnecting(true)
      clearTimeout(historyFallbackTimer)
    })
  }, [session, selectedRoom, targetLang, isAtBottom, isCurrentUserMessage, t, buildPrivateRoom, dataSaverMode, moderationMap, isBlockedUser, isMutedUser, roomDrafts, isAdminOverride])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (selectedRoom || rooms.length === 0) return
    if (preferredRoomId) {
      const preferred = rooms.find(r => String(r.id) === String(preferredRoomId))
      if (preferred) {
        joinRoom(preferred)
        return
      }
    }
    joinRoom(rooms[0])
  }, [status, rooms, selectedRoom, joinRoom, preferredRoomId])

  useEffect(() => {
    if (!selectedRoom) return
    setInputValue(roomDrafts[selectedRoom.id] || '')
  }, [selectedRoom?.id, roomDrafts])

  useEffect(() => {
    if (!pendingPrivateRoom) return
    joinRoom(pendingPrivateRoom)
    setPendingPrivateRoom(null)
  }, [pendingPrivateRoom, joinRoom])

  useEffect(() => () => { socketRef.current?.disconnect() }, [])

  // ── Scroll management ────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return
    if (isInitialLoad.current) {
      scrollChatToBottom('auto')
      isInitialLoad.current = false
      return
    }
    const lastMsg = messages[messages.length - 1]
    if (isCurrentUserMessage(lastMsg.senderId, lastMsg.username) || isAtBottom) {
      scrollChatToBottom('smooth')
      setHasNewMessages(false)
    }
  }, [messages, isCurrentUserMessage])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) setHasNewMessages(false)

    if (el.scrollTop < 70 && !loadingOlderRef.current && hasOlderMessages && selectedRoom) {
      void (async () => {
        loadingOlderRef.current = true
        setIsLoadingOlder(true)
        const previousHeight = el.scrollHeight
        try {
          const historyLimit = 30
          const blockedIds = Object.entries(moderationMap).filter(([, v]) => v.blocked).map(([k]) => k)
          const excludeUserIds = blockedIds.join(',')
          const r = await apiFetch(`/api/chats?room_id=${selectedRoom.id}&limit=${historyLimit}&offset=${historyOffset}${excludeUserIds ? `&excludeUserIds=${encodeURIComponent(excludeUserIds)}` : ''}`)
          const rows = await r.json()
          const older: Message[] = Array.isArray(rows)
            ? rows.slice().reverse().map((m: any) => ({
              id: String(m.id),
              content: m.content,
              username: m.user?.name || 'unknown',
              roomId: String(m.room?.id || selectedRoom.id),
              timestamp: m.sent_at,
              userImage: m.user?.image || '',
              reactions: [],
              senderId: m.user?.id,
              detectedLang: undefined,
              sendStatus: 'sent',
              replyTo: m.replyTo
                ? {
                  id: String(m.replyTo.id),
                  username: m.replyTo.username || (m.user?.name || 'unknown'),
                  content: m.replyTo.content || '',
                }
                : undefined,
            }))
            : []

          setMessages(prev => {
            const byId = new Map<string, Message>()
            for (const m of older) byId.set(m.id, m)
            for (const m of prev) if (!byId.has(m.id)) byId.set(m.id, m)
            return Array.from(byId.values())
          })

          setHistoryOffset(prev => prev + older.length)
          if (older.length < historyLimit) setHasOlderMessages(false)

          requestAnimationFrame(() => {
            const nextHeight = el.scrollHeight
            el.scrollTop = nextHeight - previousHeight + el.scrollTop
          })
        } catch {
        } finally {
          setIsLoadingOlder(false)
          loadingOlderRef.current = false
        }
      })()
    }
  }

  // ── Typing indicator ─────────────────────────────────────────────────────
  const handleTyping = (v: string) => {
    setInputValue(v)
    if (selectedRoom) {
      setRoomDrafts(prev => ({ ...prev, [selectedRoom.id]: v }))
    }
    if (!selectedRoom || !socketRef.current) return
    socketRef.current.emit('typing-start', selectedRoom.id)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('typing-stop', selectedRoom.id)
    }, 2000)
  }

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socketRef.current || !selectedRoom) return
    const msgToSend = inputValue.trim()
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const replyMeta = replyTarget ? { id: replyTarget.id, username: replyTarget.username, content: replyTarget.preview } : undefined;

    const optimistic: Message = {
      id: tempId,
      clientTempId: tempId,
      content: msgToSend,
      replyTo: replyMeta,
      username: session?.user?.name || 'me',
      roomId: selectedRoom.id,
      timestamp: new Date().toISOString(),
      userImage: currentUserAvatar,
      reactions: [],
      senderId: session?.user?.id,
      sendStatus: 'sending',
    }
    setMessages(prev => [...prev, optimistic])

    socketRef.current.emit('chat message', msgToSend, selectedRoom.id, tempId, replyMeta, (ack: { ok: boolean; id?: string; error?: string; clientTempId?: string }) => {
      if (ack?.ok) {
        setMessages(prev => prev.map(m => m.clientTempId === tempId ? { ...m, sendStatus: 'sent' } : m))
        return
      }
      setMessages(prev => prev.map(m => m.clientTempId === tempId ? { ...m, sendStatus: 'error' } : m))
    })

    socketRef.current.emit('typing-stop', selectedRoom.id)
    setInputValue('')
    setRoomDrafts(prev => ({ ...prev, [selectedRoom.id]: '' }))
    setReplyTarget(null)
  }

  // ── React to message ─────────────────────────────────────────────────────
  const handleReact = (messageId: string, emoji: string) => {
    if (!socketRef.current || !selectedRoom) return
    socketRef.current.emit('react', { messageId, emoji, roomId: selectedRoom.id, userId: session?.user?.id })

    // Track emoji usage
    apiFetch(`/api/users/${session?.user?.id}/emoji-favorites/${encodeURIComponent(emoji)}`, { method: 'POST' })
      .catch(() => { })

    // Update recents
    setEmojiRecents(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 10)
      return updated
    })

    setShowEmojiPicker(null)
  }

  // NEW: @Mention autocomplete
  const handleInputChange = (value: string) => {
    setInputValue(value)
    const trigger = value.lastIndexOf('@')
    if (trigger !== -1) {
      const afterTrigger = value.substring(trigger + 1)
      setMentionInput(afterTrigger)
      setShowMentionDropdown(true)
    } else {
      setShowMentionDropdown(false)
    }
  }

  const insertMention = (user: OnlineUser) => {
    const beforeAt = inputValue.substring(0, inputValue.lastIndexOf('@'))
    setInputValue(`${beforeAt}@${user.name} `)
    setShowMentionDropdown(false)
    setMentionInput('')
  }

  // NEW: Ban user
  const handleBanUser = (userId: string | number, reason: string, durationMinutes: number) => {
    if (!socketRef.current || !selectedRoom) return
    socketRef.current.emit('ban-user', {
      targetUserId: userId,
      roomId: selectedRoom.id,
      reason,
      durationMinutes,
    }, (ack: any) => {
      if (ack?.ok) {
        toast.success(durationMinutes > 0
          ? t('toast.userBannedForMinutes', { minutes: durationMinutes })
          : t('toast.userBannedPermanent'))
      } else {
        toast.error(ack?.error || t('toast.banUserError'))
      }
    })
  }

  // Peer corrections helpers
  function computeInlineDiff(original: string, corrected: string): Array<{ text: string; type: 'equal' | 'removed' | 'added' }> {
    const origTokens = original.split(/(\s+)/)
    const corrTokens = corrected.split(/(\s+)/)
    const m = origTokens.length
    const n = corrTokens.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = origTokens[i - 1] === corrTokens[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
    const result: Array<{ text: string; type: 'equal' | 'removed' | 'added' }> = []
    let i = m, j = n
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && origTokens[i - 1] === corrTokens[j - 1]) {
        result.unshift({ text: origTokens[i - 1], type: 'equal' }); i--; j--
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ text: corrTokens[j - 1], type: 'added' }); j--
      } else {
        result.unshift({ text: origTokens[i - 1], type: 'removed' }); i--
      }
    }
    return result
  }

  const openSubmitCorrection = (msg: Message) => {
    setCorrectionDraft(msg.content)
    setCorrectionExplanation('')
    setShowSubmitCorrection(msg.id)
  }

  const submitCorrection = async (messageId: string, originalContent: string) => {
    if (!correctionDraft.trim() || correctionDraft.trim() === originalContent.trim()) return
    setCorrectionSubmitting(true)
    try {
      const res = await apiFetch(`/api/messages/${messageId}/correct`, {
        method: 'POST',
        body: JSON.stringify({ corrected_text: correctionDraft.trim(), explanation: correctionExplanation.trim() || undefined }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const correction: PeerCorrection = {
        id: String(data.id || data.correctionId || Date.now()),
        correctorId: session?.user?.id ?? '',
        correctorName: session?.user?.name ?? '',
        correctedText: correctionDraft.trim(),
        explanation: correctionExplanation.trim() || undefined,
        isHelpful: false,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, corrections: [...(m.corrections || []), correction] } : m
      ))
      socketRef.current?.emit('peer-correct', {
        messageId,
        correctedText: correctionDraft.trim(),
        explanation: correctionExplanation.trim(),
        roomId: selectedRoom?.id,
      })
      setShowSubmitCorrection(null)
    } catch { }
    finally { setCorrectionSubmitting(false) }
  }

  const openViewCorrections = async (msg: Message) => {
    setViewCorrectionsList(msg.corrections || [])
    setShowViewCorrections(msg.id)
    setViewCorrectionsLoading(true)
    try {
      const res = await apiFetch(`/api/messages/${msg.id}/corrections`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setViewCorrectionsList(data.map((cc: any) => ({
            id: String(cc.id),
            correctorId: cc.correctorId ?? cc.corrector_id ?? '',
            correctorName: cc.correctorName ?? cc.corrector_name ?? '',
            correctedText: cc.correctedText ?? cc.corrected_text ?? '',
            explanation: cc.explanation ?? undefined,
            isHelpful: Boolean(cc.isHelpful ?? cc.is_helpful),
            createdAt: cc.createdAt ?? cc.created_at ?? undefined,
          })))
        }
      }
    } catch { }
    finally { setViewCorrectionsLoading(false) }
  }

  const toggleCorrectionHelpful = async (correctionId: string) => {
    setCorrectionHelpfulLoading(correctionId)
    try {
      const res = await apiFetch(`/api/corrections/${correctionId}/helpful`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setViewCorrectionsList(prev => prev.map(cc => cc.id === correctionId ? { ...cc, isHelpful: !cc.isHelpful } : cc))
    } catch { }
    finally { setCorrectionHelpfulLoading(null) }
  }

  // NEW: Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX)
    setSwipeStartY(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent, messageId: string) => {
    if (!swipeStartX || !swipeStartY) return
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const diffX = endX - swipeStartX
    const diffY = endY - swipeStartY

    // Swipe left = react
    if (diffX < -50 && Math.abs(diffY) < 30) {
      setShowEmojiPicker(messageId)
    }
    // Swipe right = reply
    else if (diffX > 50 && Math.abs(diffY) < 30) {
      const msg = messages.find(m => m.id === messageId)
      if (msg) setReplyTarget({ id: msg.id, username: msg.username, preview: msg.content.slice(0, 80) })
    }
    // Double tap (not true swipe but touch-based)

    setSwipeStartX(null)
    setSwipeStartY(null)
  }

  // NEW: Confetti animation (simple version without external library)
  const triggerConfetti = async (x: number, y: number) => {
    if (typeof window === 'undefined') return
    // Simple CSS animation effect instead of canvas-confetti
    const confetti = document.createElement('div')
    confetti.style.position = 'fixed'
    confetti.style.left = x + 'px'
    confetti.style.top = y + 'px'
    confetti.textContent = '🎉'
    confetti.style.fontSize = '24px'
    confetti.style.pointerEvents = 'none'
    confetti.style.zIndex = '999'
    confetti.style.animation = 'pop-up 1s ease-out forwards'
    document.body.appendChild(confetti)
    setTimeout(() => confetti.remove(), 1000)
  }

  // NEW: Get user role for current room
  const getUserRoleInRoom = useCallback((userId: string | number) => {
    if (String(session?.user?.id) === String(userId) && isAdminOverride) {
      return 'owner'
    }
    if (!selectedRoom) return 'user'
    return userRoles[`${selectedRoom.id}-${userId}`] || 'user'
  }, [selectedRoom, userRoles, session?.user?.id, isAdminOverride])

  // NEW: Load user role
  useEffect(() => {
    if (!selectedRoom || !session?.user?.id) return
    apiFetch(`/api/users/${session.user.id}/room-role/${selectedRoom.id}`)
      .then(r => r.json())
      .then(d => {
        setUserRoles(prev => ({
          ...prev,
          [`${selectedRoom.id}-${session.user.id}`]: d.role || 'user',
        }))
      })
      .catch(() => { })
  }, [selectedRoom, session?.user?.id])

  const sendPrivateInvite = (user: OnlineUser) => {
    if (!socketRef.current || !session?.user?.id) return
    if (String(user.userId) === String(session.user.id)) return

    const targetId = String(user.userId)
    const cooldownUntil = privateInviteCooldownRef.current.get(targetId) || 0
    const isAdmin = isAdminOverride
    if (!isAdmin && Date.now() < cooldownUntil) {
      const leftMs = cooldownUntil - Date.now()
      const leftMin = Math.max(1, Math.ceil(leftMs / 60000))
      toast.error(t('privateInvite.cooldownUser', { minutes: leftMin, name: user.name }))
      return
    }

    socketRef.current.emit('private-chat-invite', {
      toUserId: user.userId,
      fromUserId: session.user.id,
      fromName: session.user.name,
    })
  }

  const updateModeration = async (targetUserId: string | number, next: { muted?: boolean; blocked?: boolean }) => {
    if (!session?.user?.id) return
    const key = String(targetUserId)
    const current = moderationMap[key] || { muted: false, blocked: false }
    const merged = {
      muted: next.muted ?? current.muted,
      blocked: next.blocked ?? current.blocked,
    }

    setModerationMap(prev => ({ ...prev, [key]: merged }))
    try {
      await apiFetch(`/api/users/${session.user.id}/moderation/${key}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
      })
      toast.success(merged.blocked ? t('toast.userBlocked') : merged.muted ? t('toast.userMuted') : t('toast.preferencesUpdated'))
    } catch {
      setModerationMap(prev => ({ ...prev, [key]: current }))
      toast.error(t('toast.moderationUpdateError'))
    }
  }

  const applyRoomBackground = () => {
    if (!selectedRoom) return
    setRoomBackgrounds(prev => ({
      ...prev,
      [selectedRoom.id]: roomBgDraft.trim(),
    }))
    toast.success(t('toast.backgroundUpdated'))
  }

  const clearRoomBackground = () => {
    if (!selectedRoom) return
    setRoomBackgrounds(prev => {
      const next = { ...prev }
      delete next[selectedRoom.id]
      return next
    })
    setRoomBgDraft('')
    toast.success(t('toast.backgroundCleared'))
  }

  const setNicknameForMessage = (msg: Message) => {
    if (typeof window === 'undefined') return
    const key = getUserKey(msg.senderId, msg.username)
    const current = nicknames[key] || ''
    const value = window.prompt(t('settings.nicknamePrompt', { name: msg.username }), current)
    if (value === null) return
    const nickname = value.trim()
    setNicknames(prev => {
      const next = { ...prev }
      if (!nickname) delete next[key]
      else next[key] = nickname
      return next
    })
  }

  const resetChatSettingsToDefault = () => {
    setBubbleTheme('neon')
    setMyBubbleColor('#2d88ff')
    setOtherBubbleColor('#1e2430')
    setMyBubbleDraft('#2d88ff')
    setOtherBubbleDraft('#1e2430')
    setFontSize('large')
    setEffectsEnabled(true)
    setTextOnlyMode(false)
    setDataSaverMode(false)
    setDisableProfileImages(false)
    setRoomBackgrounds({})
    setNicknames({})
    setReplyTarget(null)
    setRoomBgDraft('')
    toast.success(t('toast.settingsReset'))
  }

  const applyCustomBubbleColors = () => {
    setBubbleTheme('custom')
    setMyBubbleColor(myBubbleDraft)
    setOtherBubbleColor(otherBubbleDraft)
    toast.success(t('toast.preferencesUpdated'))
  }

  const respondPrivateInvite = (accepted: boolean) => {
    if (!socketRef.current || !incomingPrivateInvite || !session?.user?.id) return
    const invite = incomingPrivateInvite
    socketRef.current.emit('private-chat-invite-response', {
      toUserId: invite.fromUserId,
      fromUserId: session.user.id,
      fromName: session.user.name,
      accepted,
    })

    if (accepted) {
      const room = buildPrivateRoom(invite.fromUserId, invite.fromName)
      setRooms(prev => prev.some(r => r.id === room.id) ? prev : [room, ...prev])
      setPendingPrivateRoom(room)
    }

    setIncomingPrivateInvite(null)
  }

  // ── Mini profile ─────────────────────────────────────────────────────────
  const fetchProfile = async (userId: string | number) => {
    setMiniProfileFollow({ isFollowing: false, followsYou: false, followersCount: 0, followingCount: 0, loading: true })
    try {
      const [profileRes, followRes] = await Promise.all([
        apiFetch(`/api/users/${userId}`),
        session?.user?.id
          ? apiFetch(`/api/users/${userId}/follow-status?viewerId=${encodeURIComponent(String(session.user.id))}`)
          : Promise.resolve(null as Response | null),
      ])

      if (!profileRes.ok) return
      const user = await profileRes.json()
      let interests = user.interests
      try { interests = typeof interests === 'string' ? JSON.parse(interests) : interests } catch { interests = [] }
      setMiniProfile({ ...user, interests })

      if (followRes?.ok) {
        const followData = await followRes.json()
        setMiniProfileFollow({
          isFollowing: Boolean(followData?.isFollowing),
          followsYou: Boolean(followData?.followsYou),
          followersCount: Number(followData?.followersCount || 0),
          followingCount: Number(followData?.followingCount || 0),
          loading: false,
        })
      } else {
        setMiniProfileFollow(prev => ({ ...prev, loading: false }))
      }
    } catch { }
    finally {
      setMiniProfileFollow(prev => ({ ...prev, loading: false }))
    }
  }

  const toggleFollowMiniProfile = async () => {
    if (!miniProfile?.id || !session?.user?.id) return
    if (String(miniProfile.id) === String(session.user.id)) return

    const wasFollowing = miniProfileFollow.isFollowing
    setMiniProfileFollow(prev => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: Math.max(0, prev.followersCount + (wasFollowing ? -1 : 1)),
      loading: true,
    }))

    try {
      const endpoint = wasFollowing ? 'unfollow' : 'follow'
      const res = await apiFetch(`/api/users/${miniProfile.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ followerId: session.user.id }),
      })
      if (!res.ok) throw new Error('follow request failed')
      const data = await res.json()
      setMiniProfileFollow(prev => ({
        ...prev,
        isFollowing: !wasFollowing,
        followersCount: Number(data?.followersCount ?? prev.followersCount),
        loading: false,
      }))
      toast.success(wasFollowing ? t('toast.unfollowed') : t('toast.following'))
    } catch {
      setMiniProfileFollow(prev => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: Math.max(0, prev.followersCount + (wasFollowing ? 1 : -1)),
        loading: false,
      }))
      toast.error(t('toast.followActionError'))
    }
  }

  // ── Report message ───────────────────────────────────────────────────────
  const submitReport = async () => {
    if (!showReport || !reportReason.trim() || !session?.user) return
    await apiFetch(`/api/report`, {
      method: 'POST',
      body: JSON.stringify({ messageId: showReport, reporterId: session.user.id, reason: reportReason }),
    })
    toast.success(t('toast.reportSent'))
    setShowReport(null); setReportReason('')
  }

  // ── Save target lang ─────────────────────────────────────────────────────
  const saveLang = (lang: string) => {
    setTargetLang(lang)
    localStorage.setItem('daisu-targetLang', lang)
    if (session?.user?.id) {
      apiFetch(`/api/users/${session.user.id}/targetlang`, {
        method: 'PATCH',
        body: JSON.stringify({ targetLang: lang }),
      }).catch(() => { })
    }
    setShowLangSelector(false)
    toast.success(t('toast.langSaved', { lang: lang.toUpperCase() }))
  }

  // ── Create room ──────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return
    apiFetch(`/api/rooms`, {
      method: 'POST',
      body: JSON.stringify({ name: newRoomName }),
    }).then(r => r.json()).then(room => {
      if (room.id) { setRooms(p => [...p, room]); setNewRoomName(''); setShowCreateRoom(false); toast.success(t('toast.roomCreated')) }
      else toast.error(room.error || t('toast.roomError'))
    }).catch(() => toast.error(t('toast.roomError')))
  }

  // ── Filtered rooms ───────────────────────────────────────────────────────
  const displayRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!filteredLang || r.language === filteredLang)
  )
  const defaultRooms = displayRooms.filter(r => r.is_default)
  const customRooms = displayRooms.filter(r => !r.is_default)

  // ── Group consecutive messages ───────────────────────────────────────────
  const filteredMessages = messages.filter((msg) => {
    if (isBlockedUser(msg.senderId)) return false
    const q = chatSearch.trim().toLowerCase()
    if (!q) return true
    const display = getDisplayName(msg.senderId, msg.username).toLowerCase()
    return msg.content.toLowerCase().includes(q) || display.includes(q)
  })

  const grouped = filteredMessages.reduce<{ msg: Message; showHeader: boolean }[]>((acc, msg, i) => {
    acc.push({ msg, showHeader: !filteredMessages[i - 1] || filteredMessages[i - 1].username !== msg.username })
    return acc
  }, [])

  // ── Loading / unauthenticated states ─────────────────────────────────────
  if (status === 'loading') return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - var(--nav-h))', background: 'var(--bg)' }}>
      <Loader2 className="animate-spin" size={28} style={{ color: 'var(--primary)' }} />
    </div>
  )
  if (status === 'unauthenticated') return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ height: 'calc(100vh - var(--nav-h))', background: 'var(--bg)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--surface)' }}>
        <MessageCircle size={28} style={{ color: 'var(--text3)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>{t('pleaseLogIn')}</p>
    </div>
  )

  return (
    <div
      onContextMenu={preventMediaActions}
      style={{ height: 'calc(100vh - var(--nav-h))', background: 'var(--bg)', display: 'flex', overflow: 'hidden', position: 'relative' }}
    >

      {/* ── Mobile overlay ────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────── */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 md:z-auto flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', height: '100%' }}>

        {/* Sidebar header */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('sidebar.title')}</h2>
            <div className="flex items-center gap-1.5">
              {/* Invitations bell */}
              <button
                onClick={() => setShowInvitationsPanel(true)}
                title={t('invitations.title')}
                className="relative p-1.5 rounded-full transition-colors"
                style={{ background: pendingInvitations.length > 0 ? 'var(--primary-light)' : 'transparent', color: pendingInvitations.length > 0 ? 'var(--primary)' : 'var(--text3)' }}
              >
                <Bell size={14} />
                {pendingInvitations.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--primary)' }}>
                    {pendingInvitations.length > 9 ? '9+' : pendingInvitations.length}
                  </span>
                )}
              </button>
              {/* Target lang indicator */}
              {targetLang && (
                <button onClick={() => setShowLangSelector(true)} title={t('sidebar.changeLang')}
                  className="text-sm px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11 }}>
                  {LANG_FLAGS[targetLang]} {targetLang.toUpperCase()}
                </button>
              )}
              {!targetLang && (
                <button onClick={() => setShowLangSelector(true)} title={t('sidebar.chooseLang')}
                  className="text-xs px-2 py-0.5 rounded-full border"
                  style={{ color: 'var(--text3)', borderColor: 'var(--border)', fontSize: 10 }}>
                  🎯 {t('sidebar.chooseLang')}
                </button>
              )}
            </div>
          </div>
          {/* Search */}
          <div className="px-3 pb-2 relative">
            <Search size={12} className="absolute left-5.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('sidebar.placeholder')}
              className="w-full pl-7 pr-3 py-1.5 rounded-full text-xs outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          {/* Lang filter chips */}
          <div className="flex gap-1.5 px-3 pb-3 flex-wrap">
            {[{ code: '', flag: '🌐', labelKey: 'sidebar.filter.all' as const }, ...TARGET_LANG_CODES.map(c => ({ code: c, flag: TARGET_LANG_FLAGS[c], labelKey: `sidebar.filter.${c}` as const }))].map(l => (
              <button key={l.code} onClick={() => setFilteredLang(l.code)}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
                style={{ background: filteredLang === l.code ? 'var(--primary)' : 'var(--surface3)', color: filteredLang === l.code ? '#fff' : 'var(--text2)' }}>
                {l.flag} {t(l.labelKey as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto py-2 px-2" style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}>
          {isLoadingRooms ? (
            <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
          ) : (
            <>
              {defaultRooms.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text3)' }}>{t('sidebar.sections.rooms')}</p>
                  {defaultRooms.map(room => <RoomItem key={room.id} room={room} selected={selectedRoom?.id === room.id} onSelect={() => joinRoom(room)} />)}
                </div>
              )}
              {customRooms.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text3)' }}>{t('sidebar.sections.custom')}</p>
                  {customRooms.map(room => <RoomItem key={room.id} room={room} selected={selectedRoom?.id === room.id} onSelect={() => joinRoom(room)} />)}
                </div>
              )}
              <button onClick={() => setShowCreateRoom(true)}
                className="w-full flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors md:hover:brightness-95"
                style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                <Plus size={13} /> {t('sidebar.newRoom')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          {/* Mobile hamburger */}
          <button className="md:hidden h-8 px-2 flex items-center justify-center rounded-lg mr-1 gap-1"
            style={{ background: 'var(--surface2)' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={16} style={{ color: 'var(--text2)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text2)' }}>{t('sidebar.sections.rooms')}</span>
          </button>

          {selectedRoom ? (
            <>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)' }}>
                <span className="text-sm">{LANG_FLAGS[selectedRoom.language || '']}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{selectedRoom.name}</p>
                  {selectedRoom.level && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                      style={{ background: `${LEVEL_COLORS[selectedRoom.level] || '#666'}20`, color: LEVEL_COLORS[selectedRoom.level] || '#666' }}>
                      {selectedRoom.level}
                    </span>
                  )}
                </div>
                {selectedRoom.description && <p className="text-[11px] truncate" style={{ color: 'var(--text3)' }}>{selectedRoom.description}</p>}
              </div>
              {/* Online users */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex -space-x-2">
                  {onlineUsers.slice(0, 3).map(u => (
                    <button key={u.userId} onClick={() => sendPrivateInvite(u)} title={t('privateInvite.withUser', { name: u.name })}
                      className="w-6 h-6 rounded-full flex-shrink-0 ring-2 overflow-hidden"
                      style={{ ringColor: 'var(--surface)' } as any}>
                      {resolveImageSrc(u.image)
                        ? <img src={resolveImageSrc(u.image)} alt={u.name} className="w-6 h-6 object-cover" />
                        : <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>{u.name[0]}</div>}
                    </button>
                  ))}
                </div>
                {onlineUsers.length > 0 && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1" />
                    {t('header.online', { count: onlineUsers.length })}
                  </span>
                )}
              </div>
              {/* Room action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isPrivateRoom && !isMemberOfRoom && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--surface3)', color: 'var(--text3)' }}>
                    {'🔒'} {t('header.inviteOnly')}
                  </span>
                )}
                {isPublicRoom && !isMemberOfRoom && (
                  <button onClick={handleJoinRoom} disabled={joiningRoom}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--primary)', color: '#fff' }}>
                    {joiningRoom ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    {t('header.join')}
                  </button>
                )}
                {isMemberOfRoom && currentRoomRole !== 'owner' && (
                  <button onClick={handleLeaveRoom} disabled={leavingRoom}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--surface3)', color: 'var(--text2)' }}>
                    {leavingRoom ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                    {t('header.leave')}
                  </button>
                )}
                {isModOrOwner && (
                  <button onClick={() => setShowRoomInviteModal(true)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <UserPlus size={11} /> {t('header.invite')}
                  </button>
                )}
                <button onClick={() => setShowRoomMembersPanel(true)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                  style={{ background: 'var(--surface3)', color: 'var(--text2)' }}>
                  <Users size={11} /> {t('header.members')}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('header.selectRoom')}</p>
          )}
        </div>

        {/* Daily prompt */}
        {dailyPrompt && selectedRoom && (
          <div className="px-4 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderBottom: '1px solid var(--border)' }}>
            <span className="font-bold flex-shrink-0">✨ {t('header.dailyPrompt')}</span>
            <span className="truncate">{dailyPrompt}</span>
            <button onClick={() => setDailyPrompt('')} className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 relative"
          style={
            !textOnlyMode && selectedRoom && roomBackgrounds[selectedRoom.id]
              ? {
                backgroundColor: roomBackgrounds[selectedRoom.id],
                overscrollBehaviorY: 'contain',
                touchAction: 'pan-y',
              }
              : { overscrollBehaviorY: 'contain', touchAction: 'pan-y' }
          }
        >
          {!selectedRoom ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                <MessageCircle size={28} style={{ color: 'var(--text3)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>{t('messages.selectRoom')}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('messages.moreRooms', { count: rooms.length })}</p>
            </div>
          ) : isLoadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Hash size={32} style={{ color: 'var(--text3)' }} />
              <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('messages.empty', { room: selectedRoom.name })}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {grouped.map(({ msg, showHeader }) => {
                const isMe = isCurrentUserMessage(msg.senderId, msg.username)
                const displayName = getDisplayName(msg.senderId, msg.username)
                const senderRole = msg.senderId ? getUserRoleInRoom(msg.senderId) : 'user'
                const showStaffShield = ['owner', 'mod'].includes(senderRole)
                const reactionSummary = (msg.reactions || []).reduce<Record<string, { count: number; reactors: Array<{ userId: string; userImage: string; userName: string }> }>>((acc, reaction) => {
                  const key = reaction.emoji
                  if (!acc[key]) {
                    acc[key] = {
                      count: 0,
                      reactors: [],
                    }
                  }
                  acc[key].count += 1

                  const reactorId = String(reaction.userId)
                  if (!acc[key].reactors.some(r => r.userId === reactorId)) {
                    acc[key].reactors.push({
                      userId: reactorId,
                      userImage: resolveImageSrc(reaction.userImage || ''),
                      userName: reaction.userName || '',
                    })
                  }
                  return acc
                }, {})
                return (
                  <motion.div
                    id={`msg-${msg.id}`}
                    key={msg.id}
                    initial={effectsEnabled ? { opacity: 0, y: 8 } : false}
                    animate={effectsEnabled ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.18 }}
                    className={`flex items-end gap-2 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {!textOnlyMode && (
                      <div className="flex-shrink-0" style={{ width: chatAvatarSize + 4, marginBottom: 2 }}>
                        <button onClick={() => msg.senderId && fetchProfile(msg.senderId)} className="block relative" title={`Ver perfil de ${displayName}`}>
                          {shouldLoadImages && resolveImageSrc(msg.userImage)
                            ? <img src={resolveImageSrc(msg.userImage)} alt={displayName} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full object-cover" style={{ width: chatAvatarSize, height: chatAvatarSize, border: '2px solid var(--border)', WebkitTouchCallout: 'none', userSelect: 'none' }} />
                            : <div className="rounded-full flex items-center justify-center text-sm font-bold"
                              style={{ width: chatAvatarSize, height: chatAvatarSize, background: 'var(--primary)', color: '#fff' }}>{displayName[0]}</div>}
                          {showStaffShield && (
                            <span
                              className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                              style={{ background: senderRole === 'owner' ? '#fbbf24' : '#60a5fa', color: '#fff', border: '1px solid var(--surface)' }}
                            >
                              🛡
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                    {/* Bubble */}
                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                      {showHeader && !isMe && (
                        <div className="flex items-center gap-1 mb-0.5 px-1">
                          <p className="text-[11px] font-semibold" style={{ color: 'var(--text3)' }}>{displayName}</p>
                          {/* NEW: Role badge */}
                          {msg.senderId && ['mod', 'owner'].includes(getUserRoleInRoom(msg.senderId)) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: getUserRoleInRoom(msg.senderId) === 'owner' ? '#fbbf24' : '#60a5fa',
                                color: getUserRoleInRoom(msg.senderId) === 'owner' ? '#78350f' : '#ffffff'
                              }}>
                              {getUserRoleInRoom(msg.senderId) === 'owner' ? '👑 OWNER' : '🛡️ MOD'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="px-3.5 py-2 text-sm break-words"
                        onDoubleClick={() => setReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })}
                        onTouchStart={(e) => { touchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null }}
                        onTouchEnd={(e) => {
                          const startX = touchStartXRef.current
                          const endX = e.changedTouches?.[0]?.clientX
                          if (startX === null || endX === undefined) return
                          if (Math.abs(endX - startX) > 70) setReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })
                        }}
                        style={{
                          background: isMe ? currentBubbleColors.mine : currentBubbleColors.other,
                          color: isMe ? '#fff' : 'var(--text)',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          maxWidth: '100%',
                          fontSize: chatFontSize,
                        }}>
                        {msg.replyTo && (
                          <div
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyTo?.id}`)
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}
                            className="mb-1 p-2 rounded max-h-20 overflow-hidden cursor-pointer opacity-90 border-l-4"
                            style={{
                              background: isMe ? 'rgba(0,0,0,0.15)' : 'var(--surface2)',
                              color: isMe ? '#ececec' : 'var(--text2)',
                              borderColor: 'var(--primary)',
                              fontSize: chatFontSize === 'large' ? '14px' : '12px',
                            }}>
                            <div className="font-semibold text-[10px] mb-0.5" style={{ color: isMe ? '#fff' : 'var(--primary)' }}>
                              {msg.replyTo.username}
                            </div>
                            <div className="line-clamp-2">{msg.replyTo.content}</div>
                          </div>
                        )}
                        {msg.content}
                      </div>
                      {/* Inline translation panel */}
                      {!msg.isDeleted && msg.content && session?.user?.nativelang && (
                        <div className="flex flex-col items-start w-full px-1">
                          <MessageTranslateButton
                            text={msg.content}
                            nativeLang={session.user.nativelang}
                            chatFontSize={chatFontSize}
                          />
                        </div>
                      )}
                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 px-1">
                          {Object.entries(reactionSummary).map(([emoji, data]) => (
                            <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                              className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                              <span>{emoji}</span>
                              {data.reactors.length > 0 && (
                                <span className="flex items-center -space-x-1.5 ml-0.5">
                                  {data.reactors.slice(0, 3).map((reactor) => (
                                    reactor.userImage
                                      ? <img key={reactor.userId} src={reactor.userImage} alt={reactor.userName || 'user'} className="w-3.5 h-3.5 rounded-full object-cover ring-1" style={{ ringColor: 'var(--surface)' } as any} />
                                      : <span key={reactor.userId} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1" style={{ background: 'var(--primary)', ringColor: 'var(--surface)' } as any}>
                                        {(reactor.userName || '?')[0]}
                                      </span>
                                  ))}
                                </span>
                              )}
                              {data.count > 1 && <span style={{ color: 'var(--text3)' }}>{data.count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Corrections badge */}
                      {!msg.isDeleted && (msg.corrections?.length ?? 0) > 0 && (
                        <button onClick={() => openViewCorrections(msg)}
                          className="flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: '#3b82f615', color: '#3b82f6', border: '1px solid #3b82f640' }}
                          title={t('corrections.badgeTooltip')}>
                          <PenLine size={10} />
                          {t('corrections.badge', { count: msg.corrections!.length })}
                        </button>
                      )}
                      {/* Time */}
                      {showHeader && msg.timestamp && (
                        <p className="text-[10px] mt-0.5 px-1" style={{ color: 'var(--text3)' }}>
                          {new Date(msg.timestamp.toString().replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {/* Action buttons (hover) */}
                    <div className={`flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 flex-wrap ${isMe ? 'flex-row-reverse' : ''}`}>
                      <button onClick={() => setReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('messages.quickReply')}>
                        <Reply size={12} style={{ color: 'var(--text3)' }} />
                      </button>
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                        <Smile size={12} style={{ color: 'var(--text3)' }} />
                      </button>
                      <button onClick={() => setNicknameForMessage(msg)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.nickname')}>
                        <UserIcon size={11} style={{ color: 'var(--text3)' }} />
                      </button>

                      {/* NEW: Mute/Unmute & Ban (only for non-own messages) */}
                      {!isMe && msg.senderId !== undefined && msg.senderId !== null && (
                        <>
                          <button onClick={() => { const isMuted = moderationMap[String(msg.senderId!)]?.muted; updateModeration(msg.senderId!, { muted: !isMuted }) }}
                            className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.muteToggle')}>
                            <span style={{ fontSize: '11px' }}>🔇</span>
                          </button>
                          <button onClick={() => { const isBlocked = moderationMap[String(msg.senderId!)]?.blocked; updateModeration(msg.senderId!, { blocked: !isBlocked }) }}
                            className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.blockToggle')}>
                            <span style={{ fontSize: '11px' }}>🚫</span>
                          </button>

                          {/* NEW: Ban (only mods/owners) */}
                          {session?.user?.id && ['mod', 'owner'].includes(getUserRoleInRoom(session.user.id)) && (
                            <button onClick={() => {
                              const duration = prompt(t('actions.banPrompt'), '60')
                              if (duration !== null && msg.senderId) {
                                handleBanUser(msg.senderId, t('actions.banDefaultReason'), parseInt(duration) || 0)
                              }
                            }}
                              className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }} title={t('actions.banUser')}>
                              <span style={{ fontSize: '11px', color: '#fff' }}>🚷</span>
                            </button>
                          )}
                        </>
                      )}

                      {!isMe && !msg.isDeleted && (
                        <button onClick={() => openSubmitCorrection(msg)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: '#3b82f615', border: '1px solid #3b82f640' }}
                          title={t('corrections.buttonTitle')}>
                          <PenLine size={11} style={{ color: '#3b82f6' }} />
                        </button>
                      )}

                      {!isMe && (
                        <button onClick={() => { setShowReport(msg.id); setReportReason('') }}
                          className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                          <Flag size={11} style={{ color: 'var(--text3)' }} />
                        </button>
                      )}
                    </div>
                    {/* Emoji picker */}
                    {showEmojiPicker === msg.id && (
                      <div className="absolute z-20 flex flex-wrap gap-1 p-2 rounded-xl shadow-xl max-w-[300px]"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', bottom: '110%' }}>
                        {emojiRecents.map(e => (
                          <button key={e} onClick={() => handleReact(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* New messages button */}
          {hasNewMessages && !isAtBottom && (
            <button onClick={() => { scrollChatToBottom('smooth'); setHasNewMessages(false) }}
              className="sticky bottom-4 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg"
              style={{ background: 'var(--primary)', display: 'flex' }}>
              <ChevronDown size={14} /> {t('messages.newMessages')}
            </button>
          )}
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-5 py-1.5 text-xs flex items-center gap-1.5" style={{ color: 'var(--text3)' }}>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: `${i * 100}ms` }} />)}
            </span>
            {t('typing.isTyping', { users: Array.from(typingUsers.values()).join(', ') })}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 flex-shrink-0" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          {replyTarget && (
            <div className="px-4 py-2 border-b flex items-center justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <div className="flex flex-col border-l-4 pl-2" style={{ borderColor: 'var(--primary)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{t('messages.quickReply')} · {replyTarget.username}</span>
                <span className="text-sm truncate opacity-80" style={{ color: 'var(--text)', maxWidth: '250px' }}>{replyTarget.preview}</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-1 rounded-full opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                style={{ color: 'var(--text2)' }}>
                <X size={16} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            {shouldLoadImages && currentUserAvatar
              ? <img src={currentUserAvatar} alt="" draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full flex-shrink-0 object-cover" style={{ width: chatAvatarSize, height: chatAvatarSize, WebkitTouchCallout: 'none', userSelect: 'none' }} />
              : <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: chatAvatarSize, height: chatAvatarSize, background: 'var(--primary)' }}>
                <span className="text-xs font-bold text-white">{session?.user?.name?.[0]}</span>
              </div>}
            <div className="flex-1 relative">
              <input value={inputValue} onChange={e => handleInputChange(e.target.value)} onTouchStart={handleTouchStart} onTouchEnd={(e) => handleTouchEnd(e, '')}
                placeholder={selectedRoom ? t('messages.inputPlaceholder', { room: selectedRoom.name }) : t('messages.inputDisabled')}
                disabled={!selectedRoom}
                className="w-full px-4 py-2.5 rounded-full text-base md:text-sm outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
              />

              {/* NEW: @Mention autocomplete dropdown */}
              {showMentionDropdown && selectedRoom && onlineUsers.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[200px] overflow-y-auto z-50"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {onlineUsers.filter(u => !mentionInput || u.name.toLowerCase().includes(mentionInput.toLowerCase())).map(user => (
                    <button key={user.userId} onClick={() => insertMention(user)}
                      className="w-full px-3 py-2 text-left text-sm hover:opacity-80 transition-opacity flex items-center gap-2"
                      style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                      {resolveImageSrc(user.image)
                        ? <img src={resolveImageSrc(user.image)} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                        : <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>{user.name[0]}</div>}
                      <span>{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowChatSettings(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              title={t('settings.title')}
            >
              <Settings size={16} style={{ color: 'var(--text2)' }} />
            </button>
            <button type="submit" disabled={!selectedRoom || !inputValue.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={e => { if (inputValue.trim()) (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)' }}>
              <Send size={15} className="text-white ml-0.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Language Selector Modal ────────────────── */}
      <AnimatePresence>
        {showChatSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowChatSettings(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96 }}
              className="p-5 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>⚙️ {t('settings.title')}</h3>
                <button onClick={() => setShowChatSettings(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.bubbleTheme')}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(['neon', 'pastel', 'minimal', 'custom'] as BubbleTheme[]).map(theme => (
                      <button key={theme} onClick={() => setBubbleTheme(theme)} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between"
                        style={{ background: bubbleTheme === theme ? 'var(--primary)' : 'var(--surface2)', color: bubbleTheme === theme ? '#fff' : 'var(--text2)', border: `1px solid ${bubbleTheme === theme ? 'var(--primary)' : 'var(--border)'}` }}>
                        <span>{t(`settings.themes.${theme}` as any)}</span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full" style={{ background: theme === 'custom' ? myBubbleDraft : BUBBLE_THEME_COLORS[theme as Exclude<BubbleTheme, 'custom'>].mine }} />
                          <span className="w-3 h-3 rounded-full" style={{ background: theme === 'custom' ? otherBubbleDraft : BUBBLE_THEME_COLORS[theme as Exclude<BubbleTheme, 'custom'>].other, border: '1px solid var(--border)' }} />
                        </span>
                      </button>
                    ))}
                  </div>
                  {bubbleTheme === 'custom' && (
                    <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{t('settings.myMessages')}</span>
                        <input type="color" value={myBubbleDraft} onChange={e => setMyBubbleDraft(e.target.value)} className="w-8 h-8 p-0 border-0 rounded-md cursor-pointer" />
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>{myBubbleDraft.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{t('settings.otherMessages')}</span>
                        <input type="color" value={otherBubbleDraft} onChange={e => setOtherBubbleDraft(e.target.value)} className="w-8 h-8 p-0 border-0 rounded-md cursor-pointer" />
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>{otherBubbleDraft.toUpperCase()}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {CUSTOM_BUBBLE_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => { setMyBubbleDraft(preset.mine); setOtherBubbleDraft(preset.other) }}
                            className="px-2 py-2 rounded-lg text-[10px] font-semibold"
                            style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                          >
                            <span className="flex items-center justify-center gap-1 mb-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: preset.mine }} />
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: preset.other, border: '1px solid var(--border)' }} />
                            </span>
                            {preset.id}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-xl p-2" style={{ background: 'var(--surface)' }}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Preview</div>
                        <div className="flex flex-col gap-1">
                          <div className="self-end px-2.5 py-1.5 rounded-xl text-xs text-white" style={{ background: myBubbleDraft }}>Hola 👋</div>
                          <div className="self-start px-2.5 py-1.5 rounded-xl text-xs" style={{ background: otherBubbleDraft, color: 'var(--text)' }}>Hi! How are you?</div>
                        </div>
                      </div>
                      <button onClick={applyCustomBubbleColors} className="w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}>
                        {t('settings.saveBackground')}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.fontSize')}</p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                      <button key={size} onClick={() => setFontSize(size)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: fontSize === size ? 'var(--primary)' : 'var(--surface2)', color: fontSize === size ? '#fff' : 'var(--text2)' }}>
                        {t(`settings.sizes.${size}` as any)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.roomBackground')}</p>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={roomBgDraft || '#000000'} onChange={e => setRoomBgDraft(e.target.value)}
                      className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer flex-shrink-0"
                      style={{ background: 'var(--surface2)' }} title={t('settings.backgroundPlaceholder')} />
                    <button onClick={applyRoomBackground} className="px-3 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--primary)' }}>{t('settings.saveBackground')}</button>
                    <button onClick={clearRoomBackground} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{t('settings.removeBackground')}</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: t('settings.effectsEnabled'), value: effectsEnabled, setValue: setEffectsEnabled },
                    { label: t('settings.textOnlyMode'), value: textOnlyMode, setValue: setTextOnlyMode },
                    { label: t('settings.dataSaverMode'), value: dataSaverMode, setValue: setDataSaverMode },
                    { label: t('settings.disableProfileImages'), value: disableProfileImages, setValue: setDisableProfileImages },
                  ].map(item => (
                    <label key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)' }}>
                      <input type="checkbox" checked={item.value} onChange={e => item.setValue(e.target.checked)} />
                      <span className="text-xs" style={{ color: 'var(--text2)' }}>{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                  {t('settings.shortcutsHint')}
                </div>

                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={resetChatSettingsToDefault}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                  >
                    {t('settings.resetDefaults')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {incomingPrivateInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94 }}
              className="p-5 rounded-2xl w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text)' }}>
                <UserIcon size={16} />
                <h3 className="font-bold text-sm">{t('privateInvite.modalTitle', { name: incomingPrivateInvite.fromName })}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => respondPrivateInvite(true)} className="py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                  {t('privateInvite.accept')}
                </button>
                <button onClick={() => respondPrivateInvite(false)} className="py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                  {t('privateInvite.reject')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLangSelector && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
              className="p-6 rounded-3xl max-w-sm w-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>🎯 {t('langSelector.title')}</h3>
              <p className="text-xs mb-5" style={{ color: 'var(--text2)' }}>{t('langSelector.subtitle')}</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {TARGET_LANG_CODES.map(code => (
                  <button key={code} onClick={() => saveLang(code)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                    style={{ background: targetLang === code ? 'var(--primary)' : 'var(--surface2)', color: targetLang === code ? '#fff' : 'var(--text)', border: `2px solid ${targetLang === code ? 'var(--primary)' : 'var(--border)'}` }}
                    onMouseEnter={e => { if (targetLang !== code) (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)' }}
                    onMouseLeave={e => { if (targetLang !== code) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                    <span className="text-3xl">{TARGET_LANG_FLAGS[code]}</span>
                    <span className="text-xs font-semibold">{t(`sidebar.filter.${code}` as any)}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowLangSelector(false)} className="w-full py-2 text-sm" style={{ color: 'var(--text3)' }}>{t('langSelector.skip')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini Profile Modal ─────────────────────── */}
      <AnimatePresence>
        {miniProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setMiniProfile(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
              className="rounded-3xl overflow-hidden max-w-xs w-full" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="h-16" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }} />
              <div className="px-5 pb-5">
                <div className="-mt-8 mb-3">
                  {resolveImageSrc(miniProfile.image)
                    ? <img src={resolveImageSrc(miniProfile.image)} alt={miniProfile.name} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="w-14 h-14 rounded-full border-4 object-cover" style={{ borderColor: 'var(--surface)', WebkitTouchCallout: 'none', userSelect: 'none' }} />
                    : <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white border-4"
                      style={{ background: 'var(--primary)', borderColor: 'var(--surface)' }}>{miniProfile.name[0]}</div>}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold" style={{ color: 'var(--text)' }}>{miniProfile.name}</h4>
                  {miniProfile.country && <span className="text-sm">{miniProfile.country}</span>}
                </div>
                {miniProfileFollow.followsYou && String(miniProfile.id) !== String(session?.user?.id) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full inline-block mb-2" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {t('miniProfile.followsYou')}
                  </span>
                )}
                {miniProfile.level && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block mb-2"
                    style={{ background: `${LEVEL_COLORS[miniProfile.level] || 'var(--primary)'}20`, color: LEVEL_COLORS[miniProfile.level] || 'var(--primary)' }}>
                    {t('miniProfile.level', { level: miniProfile.level })}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3 text-[11px]" style={{ color: 'var(--text3)' }}>
                  <span>{t('miniProfile.followersCount', { count: miniProfileFollow.followersCount })}</span>
                  <span>·</span>
                  <span>{t('miniProfile.followingCount', { count: miniProfileFollow.followingCount })}</span>
                </div>
                {String(miniProfile.id) !== String(session?.user?.id) && (
                  <button
                    onClick={toggleFollowMiniProfile}
                    disabled={miniProfileFollow.loading}
                    className="w-full mb-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
                    style={{
                      background: miniProfileFollow.isFollowing ? 'var(--surface2)' : 'var(--primary)',
                      color: miniProfileFollow.isFollowing ? 'var(--text2)' : '#fff',
                      border: miniProfileFollow.isFollowing ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {miniProfileFollow.loading
                      ? t('miniProfile.loading')
                      : miniProfileFollow.isFollowing
                        ? t('miniProfile.unfollow')
                        : t('miniProfile.follow')}
                  </button>
                )}
                {miniProfile.bio && <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text2)' }}>{miniProfile.bio}</p>}
                <div className="flex flex-wrap gap-1 text-[11px] mb-3">
                  {miniProfile.nativelang && <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>🗣 {t('miniProfile.nativelang', { lang: miniProfile.nativelang })}</span>}
                  {miniProfile.targetLang && <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>🎯 {t('miniProfile.targetLang', { lang: miniProfile.targetLang })}</span>}
                </div>
                {Array.isArray(miniProfile.interests) && miniProfile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {miniProfile.interests.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setMiniProfile(null)} className="w-full py-3 text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}>{t('miniProfile.close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit Correction Modal ─────────────────── */}
      <AnimatePresence>
        {showSubmitCorrection && (() => {
          const tgtMsg = messages.find(m => m.id === showSubmitCorrection)
          if (!tgtMsg) return null
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setShowSubmitCorrection(null)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('corrections.modalTitle')}</h3>
                  <button onClick={() => setShowSubmitCorrection(null)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>{t('corrections.originalLabel')}</p>
                  <div className="px-3 py-2 rounded-xl text-sm italic" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>{tgtMsg.content}</div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>{t('corrections.correctedLabel')}</p>
                  <textarea value={correctionDraft} onChange={e => setCorrectionDraft(e.target.value)} rows={3} autoFocus
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--primary)' }}
                    placeholder={t('corrections.correctedPlaceholder')} />
                </div>
                {correctionDraft.trim() && correctionDraft.trim() !== tgtMsg.content.trim() && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>{t('corrections.diffPreview')}</p>
                    <div className="px-3 py-2 rounded-xl text-sm leading-relaxed break-words" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      {computeInlineDiff(tgtMsg.content, correctionDraft).map((tok, idx) => {
                        if (tok.type === 'equal') return <span key={idx}>{tok.text}</span>
                        if (tok.type === 'removed') return <span key={idx} className="line-through px-0.5 rounded" style={{ background: '#ef444425', color: '#ef4444' }}>{tok.text}</span>
                        return <span key={idx} className="px-0.5 rounded font-semibold" style={{ background: '#22c55e25', color: '#16a34a' }}>{tok.text}</span>
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>{t('corrections.explanationLabel')}</p>
                  <input value={correctionExplanation} onChange={e => setCorrectionExplanation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    placeholder={t('corrections.explanationPlaceholder')} />
                </div>
                <button onClick={() => submitCorrection(tgtMsg.id, tgtMsg.content)}
                  disabled={correctionSubmitting || !correctionDraft.trim() || correctionDraft.trim() === tgtMsg.content.trim()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--primary)' }}>
                  {correctionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {t('corrections.submit')}
                </button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── View Corrections Modal ───────────────────── */}
      <AnimatePresence>
        {showViewCorrections && (() => {
          const tgtMsg = messages.find(m => m.id === showViewCorrections)
          if (!tgtMsg) return null
          const isAuthor = isCurrentUserMessage(tgtMsg.senderId, tgtMsg.username)
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setShowViewCorrections(null)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between flex-shrink-0">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                    {t('corrections.viewTitle')} ({viewCorrectionsLoading ? '...' : viewCorrectionsList.length})
                  </h3>
                  <button onClick={() => setShowViewCorrections(null)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
                </div>
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>{t('corrections.originalLabel')}</p>
                  <div className="px-3 py-2 rounded-xl text-sm italic" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>{tgtMsg.content}</div>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
                  {viewCorrectionsLoading ? (
                    <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
                  ) : viewCorrectionsList.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>{t('corrections.noCorrections')}</p>
                  ) : viewCorrectionsList.map(cc => (
                    <div key={cc.id} className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: 'var(--surface2)', border: cc.isHelpful ? '1.5px solid #22c55e' : '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{cc.correctorName}</span>
                        {cc.isHelpful && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: '#22c55e20', color: '#16a34a' }}>
                            {t('corrections.markedHelpful')}
                          </span>
                        )}
                      </div>
                      <div className="px-2 py-1.5 rounded-lg text-sm leading-relaxed break-words" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        {computeInlineDiff(tgtMsg.content, cc.correctedText).map((tok, idx) => {
                          if (tok.type === 'equal') return <span key={idx}>{tok.text}</span>
                          if (tok.type === 'removed') return <span key={idx} className="line-through px-0.5 rounded" style={{ background: '#ef444425', color: '#ef4444' }}>{tok.text}</span>
                          return <span key={idx} className="px-0.5 rounded font-semibold" style={{ background: '#22c55e25', color: '#16a34a' }}>{tok.text}</span>
                        })}
                      </div>
                      {cc.explanation && (
                        <p className="text-xs px-1" style={{ color: 'var(--text2)' }}>
                          <span className="font-semibold">{t('corrections.explanationLabel')}:</span>{' '}{cc.explanation}
                        </p>
                      )}
                      {isAuthor && String(cc.correctorId) !== String(session?.user?.id) && (
                        <button onClick={() => toggleCorrectionHelpful(cc.id)} disabled={correctionHelpfulLoading === cc.id}
                          className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                          style={{ background: cc.isHelpful ? '#22c55e20' : 'var(--surface)', color: cc.isHelpful ? '#16a34a' : 'var(--text3)', border: '1px solid ' + (cc.isHelpful ? '#22c55e' : 'var(--border)') }}>
                          {correctionHelpfulLoading === cc.id ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
                          {cc.isHelpful ? t('corrections.unhelpful') : t('corrections.markHelpful')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── Report Modal ───────────────────────────── */}
      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowReport(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="p-5 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}><Flag size={16} /> {t('report.title')}</h3>
              <div className="space-y-2 mb-3">
                {['spam', 'offensive', 'harassment', 'inappropriate', 'other'].map(r => (
                  <button key={r} onClick={() => setReportReason(r)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: reportReason === r ? 'var(--primary-light)' : 'var(--surface2)', color: reportReason === r ? 'var(--primary)' : 'var(--text)', border: `1px solid ${reportReason === r ? 'var(--primary)' : 'var(--border)'}` }}>
                    {t(`report.reasons.${r}` as any)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReport(null)} className="flex-1 py-2 rounded-xl text-sm" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{t('report.cancel')}</button>
                <button onClick={submitReport} disabled={!reportReason}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: '#ef4444' }}>{t('report.submit')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Room Modal ──────────────────────── */}
      <AnimatePresence>
        {showCreateRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowCreateRoom(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>{t('createRoom.title')}</h3>
                <button onClick={() => setShowCreateRoom(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
              </div>
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder={t('createRoom.placeholder')} autoFocus
                className="w-full px-4 py-2.5 rounded-xl text-sm mb-3 outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onKeyDown={e => e.key === 'Enter' && handleCreateRoom()} />
              <button onClick={handleCreateRoom} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                {t('createRoom.submit')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Invite Modal */}
      {selectedRoom && session?.user?.accessToken && (
        <RoomInviteModal
          show={showRoomInviteModal}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name}
          token={session.user.accessToken as string}
          onClose={() => setShowRoomInviteModal(false)}
        />
      )}

      {/* Room Members Panel */}
      {selectedRoom && session?.user?.accessToken && (
        <RoomMembersPanel
          show={showRoomMembersPanel}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name}
          token={session.user.accessToken as string}
          onClose={() => setShowRoomMembersPanel(false)}
        />
      )}

      {/* Invitations Panel */}
      {session?.user?.accessToken && (
        <RoomInvitationsPanel
          show={showInvitationsPanel}
          invitations={pendingInvitations}
          token={session.user.accessToken as string}
          onClose={() => setShowInvitationsPanel(false)}
          onAccepted={handleAcceptInvitation}
          onDeclined={handleDeclineInvitation}
        />
      )}
    </div>
  )
}

// ──── Room Item Component ───────────────────────────────────────────────────
function RoomItem({ room, selected, onSelect }: { room: ChatRoom; selected: boolean; onSelect: () => void }) {
  const levelColor = LEVEL_COLORS[room.level || ''] || 'var(--primary)'
  return (
    <button onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left mb-0.5 transition-all md:hover:bg-[var(--surface2)]"
      style={{ background: selected ? 'var(--primary-light)' : 'transparent' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: selected ? 'var(--primary)' : 'var(--surface3)' }}>
        {room.language ? LANG_FLAGS[room.language] : '#'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: selected ? 'var(--primary)' : 'var(--text)' }}>{room.name}</p>
        {room.level && <span className="text-[9px] font-bold" style={{ color: levelColor }}>{room.level}</span>}
      </div>
    </button>
  )
}