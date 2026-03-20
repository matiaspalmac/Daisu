/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { Flag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

export interface ReportDialogProps {
  showReport: string | null
  reportReason: string
  onSetReportReason: (reason: string) => void
  onClose: () => void
  onSubmit: () => void
}

export default function ReportDialog({
  showReport,
  reportReason,
  onSetReportReason,
  onClose,
  onSubmit,
}: ReportDialogProps) {
  const t = useTranslations('ChatPage')

  return (
    <AnimatePresence>
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="p-5 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}><Flag size={16} /> {t('report.title')}</h3>
            <div className="space-y-2 mb-3">
              {['spam', 'offensive', 'harassment', 'inappropriate', 'other'].map(r => (
                <button key={r} onClick={() => onSetReportReason(r)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: reportReason === r ? 'var(--primary-light)' : 'var(--surface2)', color: reportReason === r ? 'var(--primary)' : 'var(--text)', border: `1px solid ${reportReason === r ? 'var(--primary)' : 'var(--border)'}` }}>
                  {t(`report.reasons.${r}` as any)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{t('report.cancel')}</button>
              <button onClick={onSubmit} disabled={!reportReason}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#ef4444' }}>{t('report.submit')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
