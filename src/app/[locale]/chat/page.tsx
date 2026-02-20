/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, Search, Plus, Loader2, Send, Hash, X,
  User as UserIcon, Smile, Flag, Users, ChevronDown, Menu
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
interface Message { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; detectedLang?: string; senderId?: string | number; }
interface MiniProfile { id: string | number; name: string; image?: string; bio?: string; nativelang?: string; targetLang?: string; level?: string; country?: string; interests?: string[]; }
interface HistoryMessage { id: string; content: string; username: string; roomId: string; timestamp: string; userImage?: string; reactions?: Reaction[]; senderId?: string | number; detectedLang?: string; }

const url_env = process.env.NEXT_PUBLIC_API_URL

const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷', '': '💬' }
const LEVEL_COLORS: Record<string, string> = {
  'A1-A2': '#10b981', 'A1': '#10b981', 'B1-B2': '#3b82f6', 'B1': '#3b82f6',
  'C1-C2': '#8b5cf6', 'C1': '#8b5cf6', 'B1-C1': '#6366f1'
}
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '🙌']
const TARGET_LANG_CODES = ['es', 'en', 'pt'] as const
const TARGET_LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' }

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
  const [inputValue, setInputValue] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
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

  // ── Fetch rooms ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return
    setIsLoadingRooms(true)
    fetch(`${url_env}/api/rooms`)
      .then(r => r.json()).then(d => Array.isArray(d) && setRooms(d))
      .catch(() => { }).finally(() => setIsLoadingRooms(false))
  }, [status])

  // ── Connect socket when joining room ─────────────────────────────────────
  const joinRoom = useCallback((room: ChatRoom) => {
    if (selectedRoom?.id === room.id) { setSidebarOpen(false); return }
    setSelectedRoom(room)
    setMessages([])
    setOnlineUsers([])
    setTypingUsers(new Set())
    setDailyPrompt('')
    isInitialLoad.current = true
    historyReadyRef.current = false
    pendingMessagesRef.current = []
    setIsLoadingMessages(true)
    setSidebarOpen(false)

    socketRef.current?.disconnect()
    const s = io(`${url_env}`, {
      path: '/api/socket',
      auth: { username: session?.user?.name, userId: session?.user?.id, serverOffset: 0 }
    })
    socketRef.current = s

    s.on('connect', () => s.emit('join room', room.id))

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

      historyReadyRef.current = true
      setMessages(prev => {
        const byId = new Map<string, Message>()
        for (const m of normalized) byId.set(m.id, m)
        for (const m of pendingMessagesRef.current) if (!byId.has(m.id)) byId.set(m.id, m)
        pendingMessagesRef.current = []
        return Array.from(byId.values())
      })
      setIsLoadingMessages(false)
      setHasNewMessages(false)
    })

    const historyFallbackTimer = setTimeout(async () => {
      if (historyReadyRef.current) return
      try {
        const r = await fetch(`${url_env}/api/chats?room_id=${room.id}&limit=60`)
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
      } catch {
      } finally {
        setIsLoadingMessages(false)
      }
    }, 900)

    s.on('chat message', (msg: string, id: string, username: string, roomId: string, timestamp: string, userImage: string, reactions: Reaction[], senderId?: string | number, detectedLangFromServer?: string) => {
      const detectedLang = detectedLangFromServer || detectLangHeuristic(msg) || undefined
      const incoming: Message = { id, content: msg, username, roomId, timestamp, userImage, reactions: reactions || [], detectedLang, senderId }

      if (!historyReadyRef.current) {
        pendingMessagesRef.current.push(incoming)
        return
      }

      setIsLoadingMessages(false)
      setMessages(prev => {
        if (prev.some(m => m.id === id)) return prev
        const isMine = isCurrentUserMessage(senderId, username)
        // New message indicator when not at bottom
        if (!isAtBottom && !isMine) setHasNewMessages(true)
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
    s.on('user-typing', ({ name }: { name: string }) => {
      setTypingUsers(p => new Set([...p, name]))
    })
    s.on('user-stop-typing', ({ userId: uid }: { userId: string | number }) => {
      setTypingUsers(prev => { const n = new Set(prev); /* userId lookup simplified */ return n; })
    })
    s.on('daily-prompt', (prompt: string) => setDailyPrompt(prompt))
    s.on('reaction-update', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages(p => p.map(m => m.id === String(messageId) ? { ...m, reactions } : m))
    })

    s.on('disconnect', () => {
      clearTimeout(historyFallbackTimer)
    })
  }, [session, selectedRoom, targetLang, isAtBottom, isCurrentUserMessage, t])

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
  }, [messages, session, isAtBottom, isCurrentUserMessage])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) setHasNewMessages(false)
  }

  // ── Typing indicator ─────────────────────────────────────────────────────
  const handleTyping = (v: string) => {
    setInputValue(v)
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
    socketRef.current.emit('chat message', inputValue.trim(), selectedRoom.id)
    socketRef.current.emit('typing-stop', selectedRoom.id)
    setInputValue('')
  }

  // ── React to message ─────────────────────────────────────────────────────
  const handleReact = (messageId: string, emoji: string) => {
    if (!socketRef.current || !selectedRoom) return
    socketRef.current.emit('react', { messageId, emoji, roomId: selectedRoom.id })
    setShowEmojiPicker(null)
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
  const grouped = messages.reduce<{ msg: Message; showHeader: boolean }[]>((acc, msg, i) => {
    acc.push({ msg, showHeader: !messages[i - 1] || messages[i - 1].username !== msg.username })
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
    <div style={{ height: 'calc(100vh - var(--nav-h))', background: 'var(--bg)', display: 'flex', overflow: 'hidden', position: 'relative' }}>

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
        <div className="flex-1 overflow-y-auto py-2 px-2">
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
                className="w-full flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-medium"
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
          <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg mr-1"
            style={{ background: 'var(--surface2)' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={16} style={{ color: 'var(--text2)' }} />
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
                    <div key={u.userId} className="w-6 h-6 rounded-full flex-shrink-0 ring-2 overflow-hidden" style={{ ringColor: 'var(--surface)' } as any}>
                      {u.image
                        ? <Image src={u.image} alt={u.name} width={24} height={24} className="object-cover" />
                        : <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>{u.name[0]}</div>}
                    </div>
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

        {/* Messages */}
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 relative">
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
                return (
                  <div key={msg.id} className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="w-8 flex-shrink-0" style={{ marginBottom: 2 }}>
                      {showHeader && (
                        <button onClick={() => fetchProfile(msg.username)} className="block" title={`Ver perfil de ${msg.username}`}>
                          {msg.userImage
                            ? <Image src={msg.userImage} alt={msg.username} width={28} height={28} className="rounded-full" style={{ border: '2px solid var(--border)' }} />
                            : <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                              style={{ background: 'var(--primary)', color: '#fff' }}>{msg.username[0]}</div>}
                        </button>
                      )}
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                      {showHeader && !isMe && <p className="text-[11px] font-semibold mb-0.5 px-1" style={{ color: 'var(--text3)' }}>{msg.username}</p>}
                      <div className="px-3.5 py-2 text-sm break-words"
                        style={{
                          background: isMe ? 'var(--primary)' : 'var(--surface)',
                          color: isMe ? '#fff' : 'var(--text)',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          maxWidth: '100%',
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
                    <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                        <Smile size={12} style={{ color: 'var(--text3)' }} />
                      </button>
                      {!isMe && (
                        <button onClick={() => { setShowReport(msg.id); setReportReason('') }}
                          className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                          <Flag size={11} style={{ color: 'var(--text3)' }} />
                        </button>
                      )}
                    </div>
                    {/* Emoji picker */}
                    {showEmojiPicker === msg.id && (
                      <div className="absolute z-20 flex gap-1 p-2 rounded-xl shadow-xl"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', bottom: '110%' }}>
                        {EMOJI_REACTIONS.map(e => (
                          <button key={e} onClick={() => handleReact(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
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
            {t('typing.isTyping', { users: Array.from(typingUsers).join(', ') })}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 flex-shrink-0" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {session?.user?.image
              ? <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full flex-shrink-0" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
                <span className="text-xs font-bold text-white">{session?.user?.name?.[0]}</span>
              </div>}
            <input value={inputValue} onChange={e => handleTyping(e.target.value)}
              placeholder={selectedRoom ? t('messages.inputPlaceholder', { room: selectedRoom.name }) : t('messages.inputDisabled')}
              disabled={!selectedRoom}
              className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
            />
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
                  {miniProfile.image
                    ? <Image src={miniProfile.image} alt={miniProfile.name} width={56} height={56} className="rounded-full border-4" style={{ borderColor: 'var(--surface)' }} />
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
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left mb-0.5 transition-all"
      style={{ background: selected ? 'var(--primary-light)' : 'transparent' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
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