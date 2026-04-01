/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { X, Check, XCircle, Loader2, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { RoomInvite } from '@/lib/types/chat'
import { apiFetch } from '@/lib/api'
import { resolveImageSrc } from '@/lib/utils/format'

interface RoomInvitationsPanelProps {
  show: boolean
  invitations: RoomInvite[]
  token: string
  onClose: () => void
  onAccepted: (invite: RoomInvite) => void
  onDeclined: (inviteId: string | number) => void
}

export default function RoomInvitationsPanel({
  show, invitations, token, onClose, onAccepted, onDeclined,
}: RoomInvitationsPanelProps) {
  const t = useTranslations('ChatPage')
  const [processing, setProcessing] = useState<string | null>(null)

  const respond = async (invite: RoomInvite, action: 'accept' | 'decline') => {
    const id = String(invite.id)
    setProcessing(id)
    try {
      const res = await apiFetch(`/api/invites/${invite.id}/${action}`, { method: 'POST', token })
      if (res.ok) {
        if (action === 'accept') onAccepted(invite)
        else onDeclined(invite.id)
      }
    } catch { /* silent */ } finally {
      setProcessing(null)
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
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '75vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Bell size={16} style={{ color: 'var(--primary)' }} />
                <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('invitations.title')}</h3>
                {invitations.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--primary)' }}>
                    {invitations.length}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1 rounded-full opacity-60 hover:opacity-100" style={{ color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Invite list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {invitations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Bell size={28} style={{ color: 'var(--text3)', opacity: 0.4 }} />
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('invitations.empty')}</p>
                </div>
              ) : (
                invitations.map(invite => {
                  const id = String(invite.id)
                  const isProcessing = processing === id
                  const avatar = resolveImageSrc(invite.fromImage)
                  return (
                    <div
                      key={id}
                      className="flex flex-col gap-2 p-3 rounded-xl mb-2"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-2">
                        {avatar
                          ? <img src={avatar} alt={invite.fromName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>{invite.fromName[0]}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{invite.fromName}</p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text3)' }}>{t('invitations.invitedYouTo')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate" style={{ color: 'var(--primary)', maxWidth: '60%' }}># {invite.roomName}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={isProcessing}
                            onClick={() => respond(invite, 'decline')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: 'var(--surface3)', color: 'var(--text2)' }}
                          >
                            {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                            {t('invitations.decline')}
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => respond(invite, 'accept')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: 'var(--primary)' }}
                          >
                            {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            {t('invitations.accept')}
                          </button>
                        </div>
                      </div>
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
