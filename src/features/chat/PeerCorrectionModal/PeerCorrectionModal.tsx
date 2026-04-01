/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ThumbsUp, Send, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PeerCorrection } from '@/lib/types/chat'
import { apiFetch } from '@/lib/api'

// ── Diff highlight helpers ────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.split(/(\s+)/)
}

type DiffToken = { text: string; type: 'equal' | 'removed' | 'added' }

function computeDiff(original: string, corrected: string): DiffToken[] {
  const origTokens = tokenize(original)
  const corrTokens = tokenize(corrected)

  // Simple LCS-based word-level diff
  const m = origTokens.length
  const n = corrTokens.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === corrTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: DiffToken[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === corrTokens[j - 1]) {
      result.unshift({ text: origTokens[i - 1], type: 'equal' })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: corrTokens[j - 1], type: 'added' })
      j--
    } else {
      result.unshift({ text: origTokens[i - 1], type: 'removed' })
      i--
    }
  }
  return result
}

function DiffView({ original, corrected }: { original: string; corrected: string }) {
  const tokens = computeDiff(original, corrected)
  return (
    <span className="text-sm leading-relaxed break-words">
      {tokens.map((token, idx) => {
        if (token.type === 'equal') return <span key={idx}>{token.text}</span>
        if (token.type === 'removed') return (
          <span key={idx} className="line-through px-0.5 rounded"
            style={{ background: '#ef444425', color: '#ef4444' }}>
            {token.text}
          </span>
        )
        return (
          <span key={idx} className="px-0.5 rounded font-semibold"
            style={{ background: '#22c55e25', color: '#16a34a' }}>
            {token.text}
          </span>
        )
      })}
    </span>
  )
}

// ── Submit correction modal ───────────────────────────────────────────────────

interface SubmitCorrectionModalProps {
  show: boolean
  originalText: string
  messageId: string
  sessionUserId: string | number | undefined
  sessionUserName: string | undefined
  roomId: string
  onClose: () => void
  onCorrectSubmitted: (correction: PeerCorrection) => void
  onEmitSocket: (payload: {
    messageId: string
    correctedText: string
    explanation: string
    roomId: string
  }) => void
}

export function SubmitCorrectionModal({
  show,
  originalText,
  messageId,
  sessionUserId,
  sessionUserName,
  roomId,
  onClose,
  onCorrectSubmitted,
  onEmitSocket,
}: SubmitCorrectionModalProps) {
  const t = useTranslations('ChatPage')
  const [correctedText, setCorrectedText] = useState(originalText)
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset when opening
  useEffect(() => {
    if (show) {
      setCorrectedText(originalText)
      setExplanation('')
    }
  }, [show, originalText])

  const handleSubmit = async () => {
    if (!correctedText.trim() || correctedText.trim() === originalText.trim()) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/messages/${messageId}/correct`, {
        method: 'POST',
        body: JSON.stringify({
          corrected_text: correctedText.trim(),
          explanation: explanation.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()

      const correction: PeerCorrection = {
        id: String(data.id || data.correctionId || Date.now()),
        correctorId: sessionUserId ?? '',
        correctorName: sessionUserName ?? '',
        correctedText: correctedText.trim(),
        explanation: explanation.trim() || undefined,
        isHelpful: false,
        createdAt: new Date().toISOString(),
      }
      onCorrectSubmitted(correction)

      // Emit socket for real-time broadcast
      onEmitSocket({
        messageId,
        correctedText: correctedText.trim(),
        explanation: explanation.trim(),
        roomId,
      })

      onClose()
    } catch {
      // silent fail — could add toast here
    } finally {
      setSubmitting(false)
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
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                {'\u270F\uFE0F'} {t('corrections.modalTitle')}
              </h3>
              <button onClick={onClose} className="p-1 rounded-full opacity-70 hover:opacity-100"
                style={{ color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Original */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                {t('corrections.originalLabel')}
              </p>
              <div className="px-3 py-2 rounded-xl text-sm italic"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {originalText}
              </div>
            </div>

            {/* Corrected text */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                {t('corrections.correctedLabel')}
              </p>
              <textarea
                value={correctedText}
                onChange={e => setCorrectedText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  border: '1px solid var(--primary)',
                }}
                placeholder={t('corrections.correctedPlaceholder')}
                autoFocus
              />
            </div>

            {/* Live diff preview */}
            {correctedText.trim() && correctedText.trim() !== originalText.trim() && (
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                  {t('corrections.diffPreview')}
                </p>
                <div className="px-3 py-2 rounded-xl"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <DiffView original={originalText} corrected={correctedText} />
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                {t('corrections.explanationLabel')}
              </p>
              <input
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
                placeholder={t('corrections.explanationPlaceholder')}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !correctedText.trim() || correctedText.trim() === originalText.trim()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--primary)' }}
            >
              {submitting
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />
              }
              {t('corrections.submit')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── View corrections modal ────────────────────────────────────────────────────

interface ViewCorrectionsModalProps {
  show: boolean
  originalText: string
  messageId: string
  corrections: PeerCorrection[]
  sessionUserId: string | number | undefined
  isMessageAuthor: boolean
  onClose: () => void
  onMarkHelpful: (correctionId: string) => void
}

export function ViewCorrectionsModal({
  show,
  originalText,
  messageId,
  corrections,
  sessionUserId,
  isMessageAuthor,
  onClose,
  onMarkHelpful,
}: ViewCorrectionsModalProps) {
  const t = useTranslations('ChatPage')
  const [localCorrections, setLocalCorrections] = useState<PeerCorrection[]>(corrections)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Fetch fresh corrections when modal opens
  const fetchCorrections = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/messages/${messageId}/corrections`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setLocalCorrections(data.map((c: any) => ({
          id: String(c.id),
          correctorId: c.correctorId ?? c.corrector_id ?? '',
          correctorName: c.correctorName ?? c.corrector_name ?? '',
          correctedText: c.correctedText ?? c.corrected_text ?? '',
          explanation: c.explanation ?? undefined,
          isHelpful: Boolean(c.isHelpful ?? c.is_helpful),
          createdAt: c.createdAt ?? c.created_at ?? undefined,
        })))
      }
    } catch { }
  }, [messageId])

  useEffect(() => {
    if (show) {
      setLocalCorrections(corrections)
      fetchCorrections()
    }
  }, [show, corrections, fetchCorrections])

  const handleMarkHelpful = async (correctionId: string) => {
    setLoadingId(correctionId)
    try {
      const res = await apiFetch(`/api/corrections/${correctionId}/helpful`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setLocalCorrections(prev =>
        prev.map(c => c.id === correctionId ? { ...c, isHelpful: !c.isHelpful } : c)
      )
      onMarkHelpful(correctionId)
    } catch { } finally {
      setLoadingId(null)
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
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                {'\u{1F4DD}'} {t('corrections.viewTitle')} ({localCorrections.length})
              </h3>
              <button onClick={onClose} className="p-1 rounded-full opacity-70 hover:opacity-100"
                style={{ color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Original */}
            <div className="flex-shrink-0">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                {t('corrections.originalLabel')}
              </p>
              <div className="px-3 py-2 rounded-xl text-sm italic"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {originalText}
              </div>
            </div>

            {/* Corrections list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
              {localCorrections.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>
                  {t('corrections.noCorrections')}
                </p>
              ) : (
                localCorrections.map(c => (
                  <div key={c.id} className="rounded-xl p-3 flex flex-col gap-2"
                    style={{
                      background: 'var(--surface2)',
                      border: c.isHelpful ? '1.5px solid #22c55e' : '1px solid var(--border)',
                    }}>

                    {/* Corrector info */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {c.correctorName}
                      </span>
                      {c.isHelpful && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                          style={{ background: '#22c55e20', color: '#16a34a' }}>
                          {'\u{1F44D}'} {t('corrections.markedHelpful')}
                        </span>
                      )}
                    </div>

                    {/* Diff */}
                    <div className="px-2 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <DiffView original={originalText} corrected={c.correctedText} />
                    </div>

                    {/* Explanation */}
                    {c.explanation && (
                      <p className="text-xs px-1" style={{ color: 'var(--text2)' }}>
                        <span className="font-semibold">{t('corrections.explanationLabel')}:</span>{' '}
                        {c.explanation}
                      </p>
                    )}

                    {/* Helpful button — only for message author, and only for others' corrections */}
                    {isMessageAuthor && String(c.correctorId) !== String(sessionUserId) && (
                      <button
                        onClick={() => handleMarkHelpful(c.id)}
                        disabled={loadingId === c.id}
                        className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: c.isHelpful ? '#22c55e20' : 'var(--surface)',
                          color: c.isHelpful ? '#16a34a' : 'var(--text3)',
                          border: `1px solid ${c.isHelpful ? '#22c55e' : 'var(--border)'}`,
                        }}
                      >
                        {loadingId === c.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <ThumbsUp size={11} />
                        }
                        {c.isHelpful ? t('corrections.unhelpful') : t('corrections.markHelpful')}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
