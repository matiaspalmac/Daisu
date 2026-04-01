'use client'

import React from 'react'
import { User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { PrivateInvite } from '@/lib/types/chat'

export interface PrivateInviteBarProps {
  invite: PrivateInvite | null
  onRespond: (accepted: boolean) => void
}

export default function PrivateInviteBar({ invite, onRespond }: PrivateInviteBarProps) {
  const t = useTranslations('ChatPage')

  return (
    <AnimatePresence>
      {invite && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94 }}
            className="p-5 rounded-2xl w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text)' }}>
              <UserIcon size={16} />
              <h3 className="font-bold text-sm">{t('privateInvite.modalTitle', { name: invite.fromName })}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onRespond(true)} className="py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                {t('privateInvite.accept')}
              </button>
              <button onClick={() => onRespond(false)} className="py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {t('privateInvite.reject')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
