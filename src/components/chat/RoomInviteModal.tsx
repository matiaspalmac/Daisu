/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Search, Loader2, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { SearchableUser, url_env } from './types'
import { apiFetch } from '@/lib/api'
import { resolveImageSrc } from './utils'

interface RoomInviteModalProps {
  show: boolean
  roomId: string
  roomName: string
  token: string
  onClose: () => void
  onInvited?: (userId: string | number) => void
}

export default function RoomInviteModal({ show, roomId, roomName, token, onClose, onInvited }: RoomInviteModalProps) {
  const t = useTranslations('ChatPage')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<SearchableUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [invited, setInvited] = useState<Set<string>>(new Set())

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setUsers([]); return }
    setIsSearching(true)
    try {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`, { token })
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : (data.users || []))
      }
    } catch { /* silent */ } finally {
      setIsSearching(false)
    }
  }, [token])

  useEffect(() => {
    if (!show) { setSearch(''); setUsers([]); setInvited(new Set()) }
  }, [show])

  useEffect(() => {
    const id = setTimeout(() => searchUsers(search), 350)
    return () => clearTimeout(id)
  }, [search, searchUsers])

  const handleInvite = async (user: SearchableUser) => {
    const uid = String(user.id)
    setInviting(uid)
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
        token,
      })
      if (res.ok) {
        setInvited(prev => new Set(prev).add(uid))
        onInvited?.(user.id)
      }
    } catch { /* silent */ } finally {
      setInviting(null)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="rounded-2xl w-full max-w-sm flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                  {t('roomInvite.title')}
                </h3>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{roomName}</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-full opacity-60 hover:opacity-100" style={{ color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Search input */}
            <div className="px-5 pb-3 flex-shrink-0 relative">
              <Search size={13} className="absolute left-8 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('roomInvite.searchPlaceholder')}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ minHeight: 80 }}>
              {isSearching ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : users.length === 0 && search.trim() ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--text3)' }}>{t('roomInvite.noUsers')}</p>
              ) : users.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--text3)' }}>{t('roomInvite.typeToSearch')}</p>
              ) : (
                users.map(user => {
                  const uid = String(user.id)
                  const isInvited = invited.has(uid)
                  const isInviting = inviting === uid
                  const avatar = resolveImageSrc(user.image)
                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-3 px-2 py-2 rounded-xl mb-1"
                      style={{ background: 'var(--surface2)' }}
                    >
                      {avatar
                        ? <img src={avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>{user.name[0]}</div>
                      }
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user.name}</span>
                      <button
                        disabled={isInvited || isInviting}
                        onClick={() => handleInvite(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50"
                        style={{
                          background: isInvited ? 'var(--surface3)' : 'var(--primary)',
                          color: isInvited ? 'var(--text3)' : '#fff',
                        }}
                      >
                        {isInviting
                          ? <Loader2 size={12} className="animate-spin" />
                          : isInvited
                            ? t('roomInvite.invited')
                            : <><UserPlus size={12} /> {t('roomInvite.invite')}</>
                        }
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
