/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useState } from 'react'
import { X, Loader2, Crown, Shield, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { RoomMember } from '@/lib/types/chat'
import { apiFetch } from '@/lib/api'
import { resolveImageSrc } from '@/lib/utils/format'

interface RoomMembersPanelProps {
  show: boolean
  roomId: string
  roomName: string
  token: string
  onClose: () => void
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={12} style={{ color: '#f59e0b' }} />,
  mod: <Shield size={12} style={{ color: '#3b82f6' }} />,
  member: <User size={12} style={{ color: 'var(--text3)' }} />,
}

export default function RoomMembersPanel({ show, roomId, roomName, token, onClose }: RoomMembersPanelProps) {
  const t = useTranslations('ChatPage')
  const [members, setMembers] = useState<RoomMember[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!show || !roomId) return
    let cancelled = false
    setIsLoading(true)
    apiFetch(`/api/rooms/${roomId}/members`, { token })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setMembers(Array.isArray(data) ? data : (data.members || []))
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [show, roomId, token])

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
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '75vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('roomMembers.title')}</h3>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{roomName}</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-full opacity-60 hover:opacity-100" style={{ color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Members list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: 'var(--text3)' }}>{t('roomMembers.empty')}</p>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--text3)' }}>
                    {t('roomMembers.count', { count: members.length })}
                  </p>
                  {members.map(member => {
                    const avatar = resolveImageSrc(member.image)
                    return (
                      <div
                        key={String(member.id)}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl mb-1 transition-colors"
                        style={{ background: 'var(--surface2)' }}
                      >
                        {avatar
                          ? <img src={avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>{member.name[0]}</div>
                        }
                        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{member.name}</span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface3)', color: 'var(--text2)' }}>
                          {ROLE_ICONS[member.role]}
                          {t(`roomMembers.role.${member.role}` as any)}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
