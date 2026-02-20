/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, Search, Plus, Loader2, Send, Hash, X,
  User as UserIcon, Smile, Flag, Users, ChevronDown, Menu, Settings, Reply
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { showToast as toast } from 'nextjs-toast-notify'
import { io, Socket } from 'socket.io-client'
import Image from 'next/image'

// ──── Types ────────────────────────────────────────────────────────────────
interface ChatRoom { id: string; name: string; description?: string; language?: string; level?: string; is_default?: number; daily_prompt?: string; }
interface OnlineUser { userId: string | number; name: string; image?: string; targetLang?: string; }
interface Reaction { emoji: string; userId: string | number; }
interface Message { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; detectedLang?: string; senderId?: string | number; sendStatus?: 'sending' | 'sent' | 'error'; clientTempId?: string; }
interface MiniProfile { id: string | number; name: string; image?: string; bio?: string; nativelang?: string; targetLang?: string; level?: string; country?: string; interests?: string[]; }
interface HistoryMessage { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; senderId?: string | number; detectedLang?: string; }
interface PrivateInvite { fromUserId: string | number; fromName: string }

type FontSize = 'small' | 'medium' | 'large'
type BubbleTheme = 'neon' | 'pastel' | 'minimal' | 'custom'

const url_env = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

const resolveImageSrc = (src?: string) => {
  if (!src) return ''
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('data:')) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!url_env) return ''
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${url_env}${normalizedPath}`
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
  neon: { mine: '#2d88ff', other: '#1e2430' },
  pastel: { mine: '#93c5fd', other: '#f5d0fe' },
  minimal: { mine: '#4b5563', other: '#e5e7eb' },
}
const FONT_SIZE_MAP: Record<FontSize, string> = { small: '13px', medium: '15px', large: '17px' }

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
export default function ChatPage() {
  const { data: session, status } = useSession()
  const t = useTranslations('ChatPage')

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
  const [fontSize, setFontSize] = useState<FontSize>('medium')
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
  const hasLoadedServerSettingsRef = useRef(false)
  const loadingOlderRef = useRef(false)
  const [roomBgDraft, setRoomBgDraft] = useState('')
  
  // NEW: Mentions, Pins, Roles, Bans, Emojis
  const [mentionInput, setMentionInput] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})
  const [emojiRecents, setEmojiRecents] = useState<string[]>(['👍', '❤️', '😂', '👏', '🔥', '😮', '💯', '✨', '🎉', '😢'])
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null)
  const [activeReaction, setActiveReaction] = useState<{ messageId: string; x: number; y: number } | null>(null)

  const preventMediaActions = (e: React.SyntheticEvent) => e.preventDefault()

  const currentBubbleColors = bubbleTheme === 'custom'
    ? { mine: myBubbleColor, other: otherBubbleColor }
    : BUBBLE_THEME_COLORS[bubbleTheme]
  const chatFontSize = FONT_SIZE_MAP[fontSize]
  const shouldLoadImages = !textOnlyMode && !disableProfileImages && !dataSaverMode

  const getUserKey = useCallback((senderId?: string | number, username?: string) => {
    if (senderId !== undefined && senderId !== null) return `id:${String(senderId)}`
    return `name:${username || ''}`
  }, [])

  const getDisplayName = useCallback((senderId?: string | number, username?: string) => {
    const key = getUserKey(senderId, username)
    return nicknames[key] || username || 'Usuario'
  }, [getUserKey, nicknames])

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
      name: `Privado · ${otherUserName}`,
      description: 'Chat privado',
      language: selectedRoom?.language || '',
      level: selectedRoom?.level || '',
    }
  }, [session?.user?.id, selectedRoom?.language, selectedRoom?.level])

  useEffect(() => {
    let cancelled = false
    if (!shouldLoadImages) {
      setCurrentUserAvatar('')
      return
    }
    const fromSession = resolveImageSrc(session?.user?.image || '')
    if (fromSession) {
      setCurrentUserAvatar(fromSession)
      return
    }

    if (!session?.user?.id) {
      setCurrentUserAvatar('')
      return
    }

    fetch(`${url_env}/api/users/${session.user.id}`)
      .then(r => r.json())
      .then((u) => {
        if (cancelled) return
        setCurrentUserAvatar(resolveImageSrc(u?.image || ''))
      })
      .catch(() => {
        if (!cancelled) setCurrentUserAvatar('')
      })

    return () => { cancelled = true }
  }, [session?.user?.id, session?.user?.image, shouldLoadImages])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    let cancelled = false

    fetch(`${url_env}/api/users/${session.user.id}/chat-settings`)
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
      fetch(`${url_env}/api/users/${session.user.id}/chat-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      }).catch(() => { })
    }, 450)

    return () => {
      if (saveSettingsTimeoutRef.current) clearTimeout(saveSettingsTimeoutRef.current)
    }
  }, [session?.user?.id, bubbleTheme, myBubbleColor, otherBubbleColor, fontSize, effectsEnabled, textOnlyMode, dataSaverMode, disableProfileImages, roomBackgrounds, nicknames, selectedRoom?.id, roomDrafts])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    fetch(`${url_env}/api/users/${session.user.id}/moderation`)
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
    fetch(`${url_env}/api/rooms`)
      .then(r => r.json()).then(d => Array.isArray(d) && setRooms(d))
      .catch(() => { }).finally(() => setIsLoadingRooms(false))
  }, [status])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen' || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's')) {
        toast.error('Capturas deshabilitadas en el chat')
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

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
        const historyLimit = dataSaverMode ? 25 : 60
        const blockedIds = Object.entries(moderationMap).filter(([, v]) => v.blocked).map(([k]) => k)
        const excludeUserIds = blockedIds.join(',')
        const r = await fetch(`${url_env}/api/chats?room_id=${room.id}&limit=${historyLimit}${excludeUserIds ? `&excludeUserIds=${encodeURIComponent(excludeUserIds)}` : ''}`)
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

    s.on('chat message', (msg: string, id: string, username: string, roomId: string, timestamp: string, userImage: string, reactions: Reaction[], senderId?: string | number, detectedLangFromServer?: string, clientTempId?: string) => {
      if (isBlockedUser(senderId)) return
      const detectedLang = detectedLangFromServer || detectLangHeuristic(msg) || undefined
      const incoming: Message = { id, content: msg, username, roomId, timestamp, userImage, reactions: reactions || [], detectedLang, senderId, sendStatus: 'sent', clientTempId }

      if (!historyReadyRef.current) {
        pendingMessagesRef.current.push(incoming)
        return
      }

      setIsLoadingMessages(false)
      setMessages(prev => {
        if (prev.some(m => m.id === id)) return prev
        if (clientTempId) {
          const replaced = prev.map(m => m.clientTempId === clientTempId ? { ...incoming } : m)
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
        const room = buildPrivateRoom(fromUserId, fromName || 'Usuario')
        setRooms(prev => prev.some(r => r.id === room.id) ? prev : [room, ...prev])
        setPendingPrivateRoom(room)
        toast.success(`${fromName || 'Usuario'} aceptó el chat privado`)
        return
      }

      if (!session?.user?.isAdmin) {
        const fifteenMinutes = 15 * 60 * 1000
        privateInviteCooldownRef.current.set(String(fromUserId), Date.now() + fifteenMinutes)
      }
      toast.error(`${fromName || 'Usuario'} rechazó la solicitud de chat privado`)
    })
    s.on('private-chat-invite-sent', ({ delivered }: { delivered: boolean }) => {
      if (!delivered) {
        toast.error('El usuario no está conectado ahora mismo')
      }
    })
    s.on('private-chat-invite-error', ({ reason, retryAfterMs }: { reason?: string; retryAfterMs?: number }) => {
      if (reason === 'cooldown') {
        const leftMin = Math.max(1, Math.ceil((retryAfterMs || 0) / 60000))
        toast.error(`Debes esperar ${leftMin} min para volver a invitar`) 
        return
      }
      if (reason === 'blocked') {
        toast.error('No puedes invitar a este usuario')
        return
      }
      toast.error('No se pudo enviar la invitación privada')
    })

    // NEW: Socket listeners for new features
    s.on('message-pinned', ({ messageId, roomId: pinRoomId, pinnedBy }: any) => {
      if (String(pinRoomId) === String(selectedRoom?.id)) {
        void loadPinned()
        toast.success(`${pinnedBy} fijó un mensaje`)
      }
    })
    s.on('message-unpinned', ({ messageId, roomId: unpinRoomId }: any) => {
      if (String(unpinRoomId) === String(selectedRoom?.id)) {
        void loadPinned()
      }
    })
    s.on('user-banned', ({ userId, reason, isPermanent, expiresAt }: any) => {
      toast.error(`Usuario baneado${reason ? ': ' + reason : ''}`)
    })
    s.on('you-were-banned', ({ roomId: banRoomId, reason }: any) => {
      if (String(banRoomId) === String(selectedRoom?.id)) {
        toast.error(`Fuiste baneado de esta sala: ${reason || 'Sin razón especificada'}`)
        if (selectedRoom) {
          setRooms(prev => prev.filter(r => r.id !== selectedRoom.id))
          setSelectedRoom(null)
        }
      }
    })
    s.on('user-unbanned', ({ userId }: any) => {
      toast.success('Usuario desbaneado')
    })
    s.on('you-were-mentioned', ({ messageId, roomId: mentionRoomId, mentionedBy: mentionedByName }: any) => {
      toast.success(`${mentionedByName} te mencionó`)
      if (String(mentionRoomId) === String(selectedRoom?.id)) {
        void triggerConfetti(window.innerWidth / 2, 100)
      }
    })

    s.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') setIsReconnecting(true)
      clearTimeout(historyFallbackTimer)
    })
  }, [session, selectedRoom, targetLang, isAtBottom, isCurrentUserMessage, t, buildPrivateRoom, dataSaverMode, moderationMap, isBlockedUser, isMutedUser, roomDrafts])

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
          const historyLimit = dataSaverMode ? 25 : 60
          const blockedIds = Object.entries(moderationMap).filter(([, v]) => v.blocked).map(([k]) => k)
          const excludeUserIds = blockedIds.join(',')
          const r = await fetch(`${url_env}/api/chats?room_id=${selectedRoom.id}&limit=${historyLimit}&offset=${historyOffset}${excludeUserIds ? `&excludeUserIds=${encodeURIComponent(excludeUserIds)}` : ''}`)
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
    const msgToSend = replyTarget
      ? `↪ @${replyTarget.username}: ${inputValue.trim()}`
      : inputValue.trim()
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: Message = {
      id: tempId,
      clientTempId: tempId,
      content: msgToSend,
      username: session?.user?.name || 'me',
      roomId: selectedRoom.id,
      timestamp: new Date().toISOString(),
      userImage: currentUserAvatar,
      reactions: [],
      senderId: session?.user?.id,
      sendStatus: 'sending',
    }
    setMessages(prev => [...prev, optimistic])

    socketRef.current.emit('chat message', msgToSend, selectedRoom.id, tempId, (ack: { ok: boolean; id?: string; error?: string; clientTempId?: string }) => {
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
    fetch(`${url_env}/api/users/${session?.user?.id}/emoji-favorites/${encodeURIComponent(emoji)}`, { method: 'POST' })
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

  // NEW: Pin / Unpin message
  const handlePinMessage = (messageId: string) => {
    if (!socketRef.current || !selectedRoom) return
    socketRef.current.emit('pin-message', { messageId, roomId: selectedRoom.id }, (ack: any) => {
      if (ack?.ok) {
        toast.success('Mensaje fijado')
      } else {
        toast.error(ack?.error || 'Permisos insuficientes')
      }
    })
  }

  const handleUnpinMessage = (messageId: string) => {
    if (!socketRef.current || !selectedRoom) return
    socketRef.current.emit('unpin-message', { messageId, roomId: selectedRoom.id }, (ack: any) => {
      if (ack?.ok) {
        toast.success('Mensaje desfijado')
      } else {
        toast.error('Error al desfijar')
      }
    })
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
        toast.success(`Usuario baneado ${durationMinutes > 0 ? `por ${durationMinutes} minutos` : 'permanentemente'}`)
      } else {
        toast.error(ack?.error || 'Error al banear usuario')
      }
    })
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
    if (!selectedRoom) return 'user'
    return userRoles[`${selectedRoom.id}-${userId}`] || 'user'
  }, [selectedRoom, userRoles])

  // NEW: Load pinned messages
  const loadPinned = useCallback(async () => {
    if (!selectedRoom) return
    try {
      const r = await fetch(`${url_env}/api/rooms/${selectedRoom.id}/pinned`)
      const pins = await r.json()
      setPinnedMessages(Array.isArray(pins) ? pins : [])
    } catch (_) {
      setPinnedMessages([])
    }
  }, [selectedRoom])

  useEffect(() => {
    loadPinned()
  }, [selectedRoom, loadPinned])

  // NEW: Load user role
  useEffect(() => {
    if (!selectedRoom || !session?.user?.id) return
    fetch(`${url_env}/api/users/${session.user.id}/room-role/${selectedRoom.id}`)
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
    const isAdmin = Boolean(session.user.isAdmin)
    if (!isAdmin && Date.now() < cooldownUntil) {
      const leftMs = cooldownUntil - Date.now()
      const leftMin = Math.max(1, Math.ceil(leftMs / 60000))
      toast.error(`Debes esperar ${leftMin} min para volver a invitar a ${user.name}`)
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
      await fetch(`${url_env}/api/users/${session.user.id}/moderation/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      })
      toast.success(merged.blocked ? 'Usuario bloqueado' : merged.muted ? 'Usuario silenciado' : 'Preferencias actualizadas')
    } catch {
      setModerationMap(prev => ({ ...prev, [key]: current }))
      toast.error('No se pudo actualizar la moderación')
    }
  }

  const applyRoomBackground = () => {
    if (!selectedRoom) return
    setRoomBackgrounds(prev => ({
      ...prev,
      [selectedRoom.id]: roomBgDraft.trim(),
    }))
    toast.success('Fondo actualizado para este chat')
  }

  const clearRoomBackground = () => {
    if (!selectedRoom) return
    setRoomBackgrounds(prev => {
      const next = { ...prev }
      delete next[selectedRoom.id]
      return next
    })
    setRoomBgDraft('')
    toast.success('Fondo eliminado de este chat')
  }

  const setNicknameForMessage = (msg: Message) => {
    if (typeof window === 'undefined') return
    const key = getUserKey(msg.senderId, msg.username)
    const current = nicknames[key] || ''
    const value = window.prompt(`Apodo para ${msg.username} (vacío para quitar):`, current)
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
    setFontSize('medium')
    setEffectsEnabled(true)
    setTextOnlyMode(false)
    setDataSaverMode(false)
    setDisableProfileImages(false)
    setRoomBackgrounds({})
    setNicknames({})
    setReplyTarget(null)
    setRoomBgDraft('')
    toast.success('Configuración restaurada')
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
  const fetchProfile = async (username: string) => {
    try {
      const res = await fetch(`${url_env}/api/getusers`)
      const users = await res.json()
      const user = users.find((u: any) => u.name === username)
      if (user) {
        let interests = user.interests
        try { interests = typeof interests === 'string' ? JSON.parse(interests) : interests } catch { interests = [] }
        setMiniProfile({ ...user, interests })
      }
    } catch { }
  }

  // ── Report message ───────────────────────────────────────────────────────
  const submitReport = async () => {
    if (!showReport || !reportReason.trim() || !session?.user) return
    await fetch(`${url_env}/api/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      fetch(`${url_env}/api/users/${session.user.id}/targetlang`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLang: lang }),
      }).catch(() => { })
    }
    setShowLangSelector(false)
    toast.success(t('toast.langSaved', { lang: lang.toUpperCase() }))
  }

  // ── Create room ──────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return
    fetch(`${url_env}/api/rooms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text2)' }}>Salas</span>
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
                    <button key={u.userId} onClick={() => sendPrivateInvite(u)} title={`Chat privado con ${u.name}`}
                      className="w-6 h-6 rounded-full flex-shrink-0 ring-2 overflow-hidden"
                      style={{ ringColor: 'var(--surface)' } as any}>
                      {resolveImageSrc(u.image)
                        ? <Image src={resolveImageSrc(u.image)} alt={u.name} width={24} height={24} className="object-cover" />
                        : <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>{u.name[0]}</div>}
                    </button>
                  ))}
                </div>
                {onlineUsers.length > 0 && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1" />
                    {onlineUsers.length} online
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text3)' }}>Selecciona una sala</p>
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

        {/* NEW: Pinned messages banner */}
        {selectedRoom && pinnedMessages.length > 0 && (
          <div className="px-3 py-2 text-xs flex gap-2 overflow-x-auto" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
            <span className="font-bold flex-shrink-0">📌 Fijados:</span>
            {pinnedMessages.slice(0, 3).map((pin: any) => (
              <button key={pin.id} onClick={() => { }}
                className="px-2 py-1 rounded-sm flex-shrink-0 hover:opacity-80 transition-opacity"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {pin.user_name}: {pin.content.slice(0, 30)}...
              </button>
            ))}
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
                backgroundImage: `url(${roomBackgrounds[selectedRoom.id]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
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
                return (
                  <motion.div
                    key={msg.id}
                    initial={effectsEnabled ? { opacity: 0, y: 8 } : false}
                    animate={effectsEnabled ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.18 }}
                    className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {!textOnlyMode && (
                      <div className="w-8 flex-shrink-0" style={{ marginBottom: 2 }}>
                        <button onClick={() => fetchProfile(msg.username)} className="block" title={`Ver perfil de ${displayName}`}>
                          {shouldLoadImages && resolveImageSrc(msg.userImage)
                            ? <Image src={resolveImageSrc(msg.userImage)} alt={displayName} width={28} height={28} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full" style={{ border: '2px solid var(--border)', WebkitTouchCallout: 'none', userSelect: 'none' }} />
                            : <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                              style={{ background: 'var(--primary)', color: '#fff' }}>{displayName[0]}</div>}
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
                        {msg.content}
                      </div>
                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 px-1">
                          {Object.entries(msg.reactions.reduce<Record<string, number>>((a, r) => { a[r.emoji] = (a[r.emoji] || 0) + 1; return a }, {})).map(([emoji, count]) => (
                            <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                              className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                              {emoji} {count > 1 && <span style={{ color: 'var(--text3)' }}>{count}</span>}
                            </button>
                          ))}
                        </div>
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
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title="Responder rápido">
                        <Reply size={12} style={{ color: 'var(--text3)' }} />
                      </button>
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                        <Smile size={12} style={{ color: 'var(--text3)' }} />
                      </button>
                      <button onClick={() => setNicknameForMessage(msg)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title="Apodo">
                        <UserIcon size={11} style={{ color: 'var(--text3)' }} />
                      </button>
                      
                      {/* NEW: Pin/Unpin (only for mods/owners) */}
                      {!isMe && session?.user?.id && ['mod', 'owner'].includes(getUserRoleInRoom(session.user.id)) && (
                        <button onClick={() => {
                          const isPinned = pinnedMessages.some((p: any) => String(p.message_id) === String(msg.id))
                          isPinned ? handleUnpinMessage(msg.id) : handlePinMessage(msg.id)
                        }}
                          className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title="Pin/Unpin">
                          <span style={{ fontSize: '12px' }}>📌</span>
                        </button>
                      )}
                      
                      {/* NEW: Mute/Unmute & Ban (only for non-own messages) */}
                      {!isMe && msg.senderId !== undefined && msg.senderId !== null && (
                        <>
                          <button onClick={() => { const isMuted = moderationMap[String(msg.senderId!)]?.muted; updateModeration(msg.senderId!, { muted: !isMuted }) }}
                            className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title="Silenciar/Dessilenciar">
                            <span style={{ fontSize: '11px' }}>🔇</span>
                          </button>
                          <button onClick={() => { const isBlocked = moderationMap[String(msg.senderId!)]?.blocked; updateModeration(msg.senderId!, { blocked: !isBlocked }) }}
                            className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title="Bloquear/Desbloquear">
                            <span style={{ fontSize: '11px' }}>🚫</span>
                          </button>
                          
                          {/* NEW: Ban (only mods/owners) */}
                          {session?.user?.id && ['mod', 'owner'].includes(getUserRoleInRoom(session.user.id)) && (
                            <button onClick={() => {
                              const duration = prompt('Ban duration in minutes (0 for permanent):', '60')
                              if (duration !== null && msg.senderId) {
                                handleBanUser(msg.senderId, 'Comportamiento inapropiado', parseInt(duration) || 0)
                              }
                            }}
                              className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }} title="Banear usuario">
                              <span style={{ fontSize: '11px', color: '#fff' }}>🚷</span>
                            </button>
                          )}
                        </>
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
            <div className="mb-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
              <span>Respondiendo a <strong>{replyTarget.username}</strong>: {replyTarget.preview}</span>
              <button onClick={() => setReplyTarget(null)} className="ml-2" style={{ color: 'var(--text3)' }}>✕</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            {shouldLoadImages && currentUserAvatar
              ? <Image src={currentUserAvatar} alt="" width={28} height={28} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full flex-shrink-0 object-cover" style={{ WebkitTouchCallout: 'none', userSelect: 'none' }} />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
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
                        ? <Image src={resolveImageSrc(user.image)} alt={user.name} width={20} height={20} className="rounded-full" />
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
              title="Configuración del chat"
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
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>⚙️ Configuración del chat</h3>
                <button onClick={() => setShowChatSettings(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Tema de burbujas</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(['neon', 'pastel', 'minimal', 'custom'] as BubbleTheme[]).map(theme => (
                      <button key={theme} onClick={() => setBubbleTheme(theme)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: bubbleTheme === theme ? 'var(--primary)' : 'var(--surface2)', color: bubbleTheme === theme ? '#fff' : 'var(--text2)' }}>
                        {theme}
                      </button>
                    ))}
                  </div>
                  {bubbleTheme === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs" style={{ color: 'var(--text3)' }}>Mis mensajes
                        <input type="color" value={myBubbleColor} onChange={e => setMyBubbleColor(e.target.value)} className="w-full h-8 mt-1" />
                      </label>
                      <label className="text-xs" style={{ color: 'var(--text3)' }}>Mensajes del otro
                        <input type="color" value={otherBubbleColor} onChange={e => setOtherBubbleColor(e.target.value)} className="w-full h-8 mt-1" />
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Tamaño de fuente</p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                      <button key={size} onClick={() => setFontSize(size)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: fontSize === size ? 'var(--primary)' : 'var(--surface2)', color: fontSize === size ? '#fff' : 'var(--text2)' }}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Fondo por chat</p>
                  <div className="flex gap-2">
                    <input value={roomBgDraft} onChange={e => setRoomBgDraft(e.target.value)} placeholder="URL del fondo para esta conversación"
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <button onClick={applyRoomBackground} className="px-3 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--primary)' }}>Guardar</button>
                    <button onClick={clearRoomBackground} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>Quitar</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Animaciones sutiles', value: effectsEnabled, setValue: setEffectsEnabled },
                    { label: 'Vista solo texto', value: textOnlyMode, setValue: setTextOnlyMode },
                    { label: 'Ahorro de datos', value: dataSaverMode, setValue: setDataSaverMode },
                    { label: 'No cargar fotos de perfil', value: disableProfileImages, setValue: setDisableProfileImages },
                  ].map(item => (
                    <label key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)' }}>
                      <input type="checkbox" checked={item.value} onChange={e => item.setValue(e.target.checked)} />
                      <span className="text-xs" style={{ color: 'var(--text2)' }}>{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                  Atajos: doble click o deslizar sobre un mensaje para responder rápido.
                </div>

                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={resetChatSettingsToDefault}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                  >
                    Restaurar valores predeterminados
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
                <h3 className="font-bold text-sm">{incomingPrivateInvite.fromName} quiere chatear contigo por privado</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => respondPrivateInvite(true)} className="py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                  aceptar
                </button>
                <button onClick={() => respondPrivateInvite(false)} className="py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                  rechazar
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
                      ? <Image src={resolveImageSrc(miniProfile.image)} alt={miniProfile.name} width={56} height={56} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full border-4" style={{ borderColor: 'var(--surface)', WebkitTouchCallout: 'none', userSelect: 'none' }} />
                    : <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white border-4"
                      style={{ background: 'var(--primary)', borderColor: 'var(--surface)' }}>{miniProfile.name[0]}</div>}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold" style={{ color: 'var(--text)' }}>{miniProfile.name}</h4>
                  {miniProfile.country && <span className="text-sm">{miniProfile.country}</span>}
                </div>
                {miniProfile.level && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block mb-2"
                    style={{ background: `${LEVEL_COLORS[miniProfile.level] || 'var(--primary)'}20`, color: LEVEL_COLORS[miniProfile.level] || 'var(--primary)' }}>
                    {t('miniProfile.level', { level: miniProfile.level })}
                  </span>
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