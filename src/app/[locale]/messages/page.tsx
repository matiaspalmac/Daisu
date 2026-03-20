/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import {
  Send, Loader2, MessageSquare, ArrowLeft, MoreVertical,
  Pencil, Trash2, Check, X, Search,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { io, Socket } from 'socket.io-client'
import { OnlineIndicator, usePresence, PresenceBadge } from '@/components/OnlineIndicator'
import { useLocale } from 'next-intl'

// ──── Types ──────────────────────────────────────────────────────────────────

interface DMParticipant {
  id: number
  name: string
  image: string
}

interface Conversation {
  id: number
  other_user: DMParticipant
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface DMessage {
  id: number
  conversation_id: number
  sender_id: number
  content: string
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  read?: boolean
}

// ──── Helpers ─────────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

function resolveAvatar(src?: string | null): string {
  if (!src) return ''
  const t = src.trim()
  if (!t) return ''
  if (/^data:image\//i.test(t) || /^https?:\/\//i.test(t)) return t
  if (!API) return ''
  return `${API}/${t.replace(/^\/+/, '')}`
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function UserAvatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const resolved = resolveAvatar(src)
  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    )
  }
  const initials = name.charAt(0).toUpperCase()
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--primary)] text-white font-semibold"
    >
      {initials}
    </div>
  )
}

// ──── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
  isRead,
  onEdit,
  onDelete,
  t,
}: {
  msg: DMessage
  isMine: boolean
  isRead: boolean
  onEdit: (msg: DMessage) => void
  onDelete: (id: number) => void
  t: ReturnType<typeof useTranslations<'MessagesPage'>>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const isDeleted = !!msg.deleted_at

  return (
    <div className={`flex items-end gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="relative max-w-[70%]">
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isDeleted
              ? 'italic text-[var(--text3)] bg-[var(--surface2)]'
              : isMine
              ? 'bg-[var(--primary)] text-white rounded-br-sm'
              : 'bg-[var(--surface2)] text-[var(--text)] rounded-bl-sm'
          }`}
        >
          {isDeleted ? t('messageDeleted') : msg.content}
        </div>
        <div className={`text-[10px] text-[var(--text3)] mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(msg.created_at)}</span>
          {msg.updated_at && !isDeleted && (
            <span className="opacity-60">({t('edited')})</span>
          )}
          {/* Read receipt: show ✓✓ for my sent messages that have been read */}
          {isMine && !isDeleted && (
            <span
              className={`ml-0.5 font-bold ${isRead ? 'text-[var(--primary)]' : 'text-[var(--text3)]'}`}
              title={isRead ? t('readReceipt') : t('sent')}
            >
              ✓✓
            </span>
          )}
        </div>

        {/* Actions */}
        {isMine && !isDeleted && (
          <div
            ref={menuRef}
            className={`absolute top-0 ${isMine ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-1`}
          >
            <button
              onClick={() => onEdit(msg)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)] transition-colors"
              title={t('edit')}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(msg.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--surface2)] text-[var(--text2)] hover:bg-[#ef444420] hover:text-[#ef4444] transition-colors"
              title={t('delete')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ──── Conversation Item with Presence ────────────────────────────────────────

/**
 * Wrapper that fetches presence for each conversation's other user.
 * Using a component (not a hook in a loop) keeps the rules-of-hooks intact.
 */
function ConversationItemWithPresence({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation
  isActive: boolean
  onClick: () => void
}) {
  const presence = usePresence(conv.other_user.id, 60_000)
  return (
    <ConversationItem
      conv={conv}
      isActive={isActive}
      onClick={onClick}
      isOnline={presence?.isOnline}
    />
  )
}

// ──── Conversation Item ────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onClick,
  isOnline,
}: {
  conv: Conversation
  isActive: boolean
  onClick: () => void
  isOnline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface2)] ${
        isActive ? 'bg-[var(--primary-light)] border-l-2 border-[var(--primary)]' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar src={conv.other_user.image} name={conv.other_user.name} size={44} />
        {/* Online indicator dot — bottom-right of avatar */}
        {isOnline !== undefined && (
          <OnlineIndicator
            isOnline={isOnline}
            size={12}
            className="absolute bottom-0 right-0"
          />
        )}
        {conv.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
            {conv.unread_count > 99 ? '99+' : conv.unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold truncate text-[var(--text)] ${conv.unread_count > 0 ? 'font-bold' : ''}`}>
            {conv.other_user.name}
          </span>
          <span className="text-[11px] text-[var(--text3)] flex-shrink-0 ml-2">
            {formatTime(conv.last_message_at)}
          </span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-[var(--text)] font-medium' : 'text-[var(--text3)]'}`}>
          {conv.last_message ?? ''}
        </p>
      </div>
    </button>
  )
}

// ──── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-[var(--text3)] italic">{name}</span>
    </div>
  )
}

// ──── Main Page ───────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const t = useTranslations('MessagesPage')
  const router = useRouter()

  // Conversations list
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convsLoading, setConvsLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Active conversation
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [messages, setMessages] = useState<DMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 30

  // Send / edit
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingMsg, setEditingMsg] = useState<DMessage | null>(null)
  const [editText, setEditText] = useState('')

  // Socket & real-time state
  const socketRef = useRef<Socket | null>(null)
  const [typingInfo, setTypingInfo] = useState<{ name: string } | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const myTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Map of conversationId -> Set of userIds who have read
  const [readByConv, setReadByConv] = useState<Record<number, Set<number>>>({})
  // Track which convId is currently active in a ref for socket callbacks
  const activeConvIdRef = useRef<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    const token = (session.user as any)?.accessToken
    const socket = io(API, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket

    // Incoming DM message
    socket.on('dm-message', (payload: { conversationId: number; message: { id: number; sender_id: number; content: string; sent_at: string } }) => {
      const { conversationId, message } = payload
      const normalized: DMessage = {
        id: message.id,
        conversation_id: conversationId,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.sent_at,
        updated_at: null,
        deleted_at: null,
      }
      if (activeConvIdRef.current === conversationId) {
        setMessages(prev => {
          // Avoid duplicates (in case REST already added it)
          if (prev.some(m => m.id === normalized.id)) return prev
          return [...prev, normalized]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        // Emit read receipt since we are actively viewing this conversation
        socket.emit('dm-read', { conversationId })
      } else {
        // Increment unread badge for conversations not currently open
        setConversations(prev =>
          prev.map(c =>
            c.id === conversationId
              ? { ...c, unread_count: c.unread_count + 1, last_message: message.content, last_message_at: message.sent_at }
              : c
          )
        )
      }
    })

    // Typing indicators
    socket.on('dm-typing', (payload: { conversationId: number; userId: number; name: string }) => {
      if (activeConvIdRef.current !== payload.conversationId) return
      setTypingInfo({ name: payload.name })
      // Auto-clear after 3s in case stop event is missed
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setTypingInfo(null), 3000)
    })

    socket.on('dm-stop-typing', (payload: { conversationId: number; userId: number }) => {
      if (activeConvIdRef.current !== payload.conversationId) return
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setTypingInfo(null)
    })

    // Read receipts
    socket.on('dm-read-receipt', (payload: { conversationId: number; userId: number }) => {
      const { conversationId, userId } = payload
      setReadByConv(prev => {
        const existing = prev[conversationId] ? new Set(prev[conversationId]) : new Set<number>()
        existing.add(userId)
        return { ...prev, [conversationId]: existing }
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current)
    }
  }, [status, session])

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setConvsLoading(true)
      const res = await apiFetch('/api/dms')
      if (res.ok) {
        const data = await res.json()
        setConversations(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    } finally {
      setConvsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      loadConversations()
    }
  }, [status, loadConversations])

  // ── Load messages for active conversation ───────────────────────────────────
  const loadMessages = useCallback(async (convId: number, reset = false) => {
    try {
      setMsgsLoading(true)
      const currentOffset = reset ? 0 : offset
      const res = await apiFetch(`/api/dms/${convId}/messages?limit=${LIMIT}&offset=${currentOffset}`)
      if (res.ok) {
        const data: DMessage[] = await res.json()
        if (reset) {
          setMessages(data.reverse())
          setOffset(data.length)
        } else {
          setMessages(prev => [...data.reverse(), ...prev])
          setOffset(prev => prev + data.length)
        }
        setHasMore(data.length === LIMIT)
      }
    } catch {
      // ignore
    } finally {
      setMsgsLoading(false)
    }
  }, [offset])

  const openConversation = useCallback(async (convId: number) => {
    setActiveConvId(convId)
    setMessages([])
    setOffset(0)
    setHasMore(false)
    setEditingMsg(null)
    setTypingInfo(null)

    // Mark as read via REST
    try {
      await apiFetch(`/api/dms/${convId}/read`, { method: 'POST' })
    } catch { /* ignore */ }

    // Emit dm-read via socket
    if (socketRef.current) {
      socketRef.current.emit('dm-read', { conversationId: convId })
    }

    // Update local unread badge
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
    )

    // Load messages (bypass stale offset by calling directly with 0)
    try {
      setMsgsLoading(true)
      const res = await apiFetch(`/api/dms/${convId}/messages?limit=${LIMIT}&offset=0`)
      if (res.ok) {
        const data: DMessage[] = await res.json()
        setMessages(data.reverse())
        setOffset(data.length)
        setHasMore(data.length === LIMIT)
      }
    } catch { /* ignore */ } finally {
      setMsgsLoading(false)
    }
  }, [])

  // Scroll to bottom when opening a conversation
  useEffect(() => {
    if (activeConvId && !msgsLoading) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [activeConvId, msgsLoading])

  // Focus input when opening conversation
  useEffect(() => {
    if (activeConvId) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeConvId])

  // ── Load more (scroll pagination) ──────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!listRef.current || !hasMore || msgsLoading || !activeConvId) return
    if (listRef.current.scrollTop < 80) {
      loadMessages(activeConvId, false)
    }
  }, [hasMore, msgsLoading, activeConvId, loadMessages])

  // ── Typing emit helpers ──────────────────────────────────────────────────────
  const handleInputChange = (value: string, isEdit: boolean) => {
    if (isEdit) {
      setEditText(value)
    } else {
      setInput(value)
    }

    if (!activeConvId || !socketRef.current) return

    // Emit typing-start
    socketRef.current.emit('dm-typing-start', { conversationId: activeConvId })

    // Reset the idle timer: emit typing-stop after 2s of no input
    if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current)
    myTypingTimerRef.current = setTimeout(() => {
      if (socketRef.current && activeConvIdRef.current) {
        socketRef.current.emit('dm-typing-stop', { conversationId: activeConvIdRef.current })
      }
    }, 2000)
  }

  const stopTyping = () => {
    if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current)
    if (socketRef.current && activeConvIdRef.current) {
      socketRef.current.emit('dm-typing-stop', { conversationId: activeConvIdRef.current })
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const content = input.trim()
    if (!content || !activeConvId || sending) return
    setSending(true)
    setInput('')
    stopTyping()
    try {
      const res = await apiFetch(`/api/dms/${activeConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const msg: DMessage = await res.json()
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConvId
              ? { ...c, last_message: content, last_message_at: msg.created_at }
              : c
          )
        )
        // Also emit via socket for real-time delivery to the other party
        if (socketRef.current) {
          socketRef.current.emit('dm-message', { conversationId: activeConvId, content })
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  // ── Edit message ────────────────────────────────────────────────────────────
  const submitEdit = async () => {
    if (!editingMsg || !activeConvId) return
    const content = editText.trim()
    if (!content) return
    stopTyping()
    try {
      const res = await apiFetch(`/api/dms/${activeConvId}/messages/${editingMsg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const updated: DMessage = await res.json()
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
      }
    } catch { /* ignore */ } finally {
      setEditingMsg(null)
      setEditText('')
    }
  }

  // ── Delete message ──────────────────────────────────────────────────────────
  const deleteMessage = async (msgId: number) => {
    if (!activeConvId) return
    try {
      const res = await apiFetch(`/api/dms/${activeConvId}/messages/${msgId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m)
        )
      }
    } catch { /* ignore */ }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeConv = conversations.find(c => c.id === activeConvId) ?? null
  const myId = (session?.user as any)?.id ? Number((session!.user as any).id) : -1

  const filteredConvs = conversations.filter(c =>
    c.other_user.name.toLowerCase().includes(search.toLowerCase())
  )

  // Determine if the other user has read messages in the active conversation
  const otherUserId = activeConv?.other_user?.id ?? -1

  // ── Presence for the active DM partner ──────────────────────────────────────
  const locale = useLocale()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activePresence = usePresence(otherUserId > 0 ? otherUserId : null, 30_000)
  const activeConvReadSet = activeConvId ? (readByConv[activeConvId] ?? new Set<number>()) : new Set<number>()
  const otherUserHasRead = activeConvReadSet.has(otherUserId)

  // ── Loading state ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--nav-h))]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex bg-[var(--bg)]"
      style={{ height: 'calc(100vh - var(--nav-h))' }}
    >
      {/* ── Sidebar: conversation list ─────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-[var(--border)] bg-[var(--surface)] flex-shrink-0 transition-all duration-200 ${
          activeConvId ? 'hidden md:flex md:w-[320px]' : 'flex w-full md:w-[320px]'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <h1 className="text-base font-bold text-[var(--text)]">{t('title')}</h1>
          {/* Search */}
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm bg-[var(--surface2)] text-[var(--text)] placeholder-[var(--text3)] border-none outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--text3)]">
              <MessageSquare size={36} className="opacity-40" />
              <p className="text-sm">{t('noConversations')}</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConversationItemWithPresence
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onClick={() => openConversation(conv.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Main: messages panel ───────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col bg-[var(--surface)] ${activeConvId ? 'flex' : 'hidden md:flex'}`}>
        {activeConv ? (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0 bg-[var(--surface)]">
              {/* Back button (mobile) */}
              <button
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface2)] text-[var(--text2)] transition-colors"
                onClick={() => setActiveConvId(null)}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="relative flex-shrink-0">
                <UserAvatar src={activeConv.other_user.image} name={activeConv.other_user.name} size={36} />
                {activePresence && (
                  <OnlineIndicator
                    isOnline={activePresence.isOnline}
                    size={11}
                    className="absolute bottom-0 right-0"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{activeConv.other_user.name}</p>
                {typingInfo ? (
                  <p className="text-xs text-[var(--text3)] italic animate-pulse">
                    {t('typing', { name: typingInfo.name })}
                  </p>
                ) : activePresence ? (
                  <PresenceBadge
                    presence={activePresence}
                    locale={locale}
                    labels={{
                      online: t('presence.online'),
                      lastSeen: t('presence.lastSeen'),
                    }}
                  />
                ) : null}
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface2)] text-[var(--text2)] transition-colors">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Messages list */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
              onScroll={handleScroll}
            >
              {/* Load more trigger */}
              {hasMore && (
                <div className="flex justify-center py-2">
                  {msgsLoading ? (
                    <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
                  ) : (
                    <button
                      className="text-xs text-[var(--primary)] hover:underline"
                      onClick={() => loadMessages(activeConvId!, false)}
                    >
                      {t('loadMore')}
                    </button>
                  )}
                </div>
              )}

              {msgsLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                </div>
              )}

              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_id === myId}
                  isRead={msg.sender_id === myId && otherUserHasRead}
                  onEdit={m => { setEditingMsg(m); setEditText(m.content) }}
                  onDelete={deleteMessage}
                  t={t}
                />
              ))}

              {/* Typing indicator below messages */}
              {typingInfo && (
                <TypingIndicator name={typingInfo.name} />
              )}

              <div ref={bottomRef} />
            </div>

            {/* Edit bar */}
            {editingMsg && (
              <div className="px-4 py-2 bg-[var(--primary-light)] border-t border-[var(--border)] flex items-center gap-2 flex-shrink-0">
                <Pencil size={14} className="text-[var(--primary)] flex-shrink-0" />
                <span className="text-xs text-[var(--primary)] flex-1 truncate">
                  {t('editingMessage')}: {editingMsg.content}
                </span>
                <button
                  onClick={() => { setEditingMsg(null); setEditText('') }}
                  className="text-[var(--text3)] hover:text-[var(--text)]"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-2 flex-shrink-0 bg-[var(--surface)]">
              <input
                ref={inputRef}
                type="text"
                value={editingMsg ? editText : input}
                onChange={e => handleInputChange(e.target.value, !!editingMsg)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    editingMsg ? submitEdit() : sendMessage()
                  }
                  if (e.key === 'Escape' && editingMsg) {
                    setEditingMsg(null)
                    setEditText('')
                    stopTyping()
                  }
                }}
                placeholder={t('inputPlaceholder')}
                className="flex-1 px-4 py-2 rounded-full bg-[var(--surface2)] text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none border border-[var(--border)] focus:border-[var(--primary)] transition-colors"
                disabled={sending}
              />
              {editingMsg ? (
                <button
                  onClick={submitEdit}
                  disabled={!editText.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--primary)] text-white disabled:opacity-40 hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0"
                >
                  <Check size={16} />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--primary)] text-white disabled:opacity-40 hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Empty state — no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--text3)]">
            <MessageSquare size={56} className="opacity-30" />
            <p className="text-base font-medium">{t('selectConversation')}</p>
            <p className="text-sm opacity-60">{t('selectConversationHint')}</p>
          </div>
        )}
      </main>
    </div>
  )
}
