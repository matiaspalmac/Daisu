/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Search, Trash2, RotateCcw, ChevronRight,
  ChevronLeft, Check, X, BarChart3, Filter, Loader2, RefreshCw
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabWord {
  id: number
  word: string
  translation: string
  language: string
  context_sentence?: string
  source?: string
  notes?: string
  mastery_level: number
  created_at: string
  next_review_at?: string
}

interface VocabStats {
  by_mastery: Record<string, number>
  by_language: Record<string, number>
  total: number
}

interface AddWordForm {
  word: string
  translation: string
  language: string
  context_sentence: string
  notes: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MASTERY_COLORS: Record<number, { bg: string; text: string; border: string; dot: string }> = {
  0: { bg: 'bg-[#6b728020]', text: 'text-[#6b7280]', border: 'border-[#6b728040]', dot: '#6b7280' },
  1: { bg: 'bg-[#3b82f620]', text: 'text-[#3b82f6]', border: 'border-[#3b82f640]', dot: '#3b82f6' },
  2: { bg: 'bg-[#f59e0b20]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b40]', dot: '#f59e0b' },
  3: { bg: 'bg-[#10b98120]', text: 'text-[#10b981]', border: 'border-[#10b98140]', dot: '#10b981' },
}

const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' }
const LANG_OPTS = ['es', 'en', 'pt']

// ─── Flashcard Component ───────────────────────────────────────────────────────

function FlashcardMode({
  words,
  onReview,
  onClose,
  t,
}: {
  words: VocabWord[]
  onReview: (id: number, correct: boolean) => Promise<void>
  onClose: () => void
  t: ReturnType<typeof useTranslations<'VocabularyPage'>>
}) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState({ correct: 0, incorrect: 0 })

  const current = words[idx]

  const handleAnswer = async (correct: boolean) => {
    if (submitting) return
    setSubmitting(true)
    await onReview(current.id, correct)
    setResults(r => ({ ...r, correct: r.correct + (correct ? 1 : 0), incorrect: r.incorrect + (correct ? 0 : 1) }))
    setSubmitting(false)
    setFlipped(false)
    if (idx + 1 >= words.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
    }
  }

  if (done || words.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-[var(--border)]">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('flashcard.doneTitle')}</h3>
          <p className="text-[var(--text2)] mb-6">
            {t('flashcard.doneResult', { correct: results.correct, total: words.length })}
          </p>
          <div className="flex gap-3 justify-center mb-6">
            <div className="px-4 py-2 rounded-xl bg-[#10b98120] text-[#10b981] font-semibold">
              ✓ {results.correct}
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#ef444420] text-[#ef4444] font-semibold">
              ✗ {results.incorrect}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all"
          >
            {t('flashcard.close')}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <span className="text-[var(--text2)] text-sm font-medium">
          {idx + 1} / {words.length}
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--text2)] hover:text-[var(--text)] transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-1.5 bg-[var(--surface2)] rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-[var(--primary)] rounded-full"
          animate={{ width: `${((idx) / words.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md cursor-pointer"
        onClick={() => setFlipped(f => !f)}
      >
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden min-h-[220px] flex flex-col items-center justify-center p-8 text-center relative">
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MASTERY_COLORS[current.mastery_level]?.bg} ${MASTERY_COLORS[current.mastery_level]?.text}`}>
              {t(`mastery.${current.mastery_level}` as any)}
            </span>
          </div>
          <div className="absolute top-3 left-3 text-lg">
            {LANG_FLAGS[current.language] || '🌐'}
          </div>

          <AnimatePresence mode="wait">
            {!flipped ? (
              <motion.div
                key="front"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 90 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="text-3xl font-bold text-[var(--text)]">{current.word}</p>
                {current.context_sentence && (
                  <p className="text-sm text-[var(--text3)] italic max-w-xs">"{current.context_sentence}"</p>
                )}
                <p className="text-xs text-[var(--text3)] mt-2">{t('flashcard.tapToReveal')}</p>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 90 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="text-sm text-[var(--text3)] uppercase tracking-wider font-medium">{t('flashcard.translation')}</p>
                <p className="text-3xl font-bold text-[var(--primary)]">{current.translation}</p>
                {current.notes && (
                  <p className="text-sm text-[var(--text2)] max-w-xs">{current.notes}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Answer buttons */}
      <div className="flex gap-4 mt-6 w-full max-w-md">
        <button
          onClick={() => handleAnswer(false)}
          disabled={submitting || !flipped}
          className="flex-1 py-3 rounded-xl font-semibold text-[#ef4444] bg-[#ef444415] hover:bg-[#ef444430] border border-[#ef444430] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <X size={18} /> {t('flashcard.incorrect')}
        </button>
        <button
          onClick={() => handleAnswer(true)}
          disabled={submitting || !flipped}
          className="flex-1 py-3 rounded-xl font-semibold text-[#10b981] bg-[#10b98115] hover:bg-[#10b98130] border border-[#10b98130] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Check size={18} /> {t('flashcard.correct')}
        </button>
      </div>

      {!flipped && (
        <p className="text-[var(--text3)] text-xs mt-4">{t('flashcard.tapCardFirst')}</p>
      )}
    </motion.div>
  )
}

// ─── Add Word Form ─────────────────────────────────────────────────────────────

function AddWordModal({
  onAdd,
  onClose,
  t,
}: {
  onAdd: (form: AddWordForm) => Promise<void>
  onClose: () => void
  t: ReturnType<typeof useTranslations<'VocabularyPage'>>
}) {
  const [form, setForm] = useState<AddWordForm>({
    word: '', translation: '', language: 'es', context_sentence: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.word.trim() || !form.translation.trim()) return
    setSubmitting(true)
    await onAdd(form)
    setSubmitting(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-[var(--surface)] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[var(--border)]"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[var(--text)]">{t('addWord.title')}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface2)] text-[var(--text2)] hover:text-[var(--text)] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5 uppercase tracking-wider">
              {t('addWord.language')}
            </label>
            <div className="flex gap-2">
              {LANG_OPTS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, language: l }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    form.language === l
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--surface2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--primary)]'
                  }`}
                >
                  {LANG_FLAGS[l]} {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Word */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5 uppercase tracking-wider">
              {t('addWord.word')} <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={form.word}
              onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
              placeholder={t('addWord.wordPlaceholder')}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
            />
          </div>

          {/* Translation */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5 uppercase tracking-wider">
              {t('addWord.translation')} <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={form.translation}
              onChange={e => setForm(f => ({ ...f, translation: e.target.value }))}
              placeholder={t('addWord.translationPlaceholder')}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
            />
          </div>

          {/* Context sentence */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5 uppercase tracking-wider">
              {t('addWord.context')}
            </label>
            <input
              type="text"
              value={form.context_sentence}
              onChange={e => setForm(f => ({ ...f, context_sentence: e.target.value }))}
              placeholder={t('addWord.contextPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5 uppercase tracking-wider">
              {t('addWord.notes')}
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t('addWord.notesPlaceholder')}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text2)] bg-[var(--surface2)] hover:bg-[var(--surface3)] transition-all border border-[var(--border)]"
            >
              {t('addWord.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !form.word.trim() || !form.translation.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {t('addWord.submit')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const { data: session, status } = useSession()
  const t = useTranslations('VocabularyPage')

  // State
  const [words, setWords] = useState<VocabWord[]>([])
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [reviewWords, setReviewWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filters
  const [filterLang, setFilterLang] = useState<string>('')
  const [filterMastery, setFilterMastery] = useState<string>('')
  const [search, setSearch] = useState('')

  // UI modes
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFlashcard, setShowFlashcard] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') redirect('/login')
  }, [status])

  // Fetch words
  const fetchWords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLang) params.set('language', filterLang)
      if (filterMastery !== '') params.set('mastery_level', filterMastery)
      if (search) params.set('search', search)
      params.set('limit', '50')
      params.set('offset', '0')
      const res = await apiFetch(`/api/vocabulary?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setWords(Array.isArray(data) ? data : data.words ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [filterLang, filterMastery, search])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await apiFetch('/api/vocabulary/stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Fetch review words
  const fetchReviewWords = useCallback(async () => {
    try {
      const res = await apiFetch('/api/vocabulary/review')
      if (res.ok) {
        const data = await res.json()
        setReviewWords(Array.isArray(data) ? data : data.words ?? [])
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWords()
      fetchStats()
      fetchReviewWords()
    }
  }, [status, fetchWords, fetchStats, fetchReviewWords])

  // Add word
  const handleAddWord = async (form: AddWordForm) => {
    const res = await apiFetch('/api/vocabulary', {
      method: 'POST',
      body: JSON.stringify({
        word: form.word.trim(),
        translation: form.translation.trim(),
        language: form.language,
        context_sentence: form.context_sentence.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    })
    if (res.ok) {
      fetchWords()
      fetchStats()
    }
  }

  // Delete word
  const handleDelete = async (id: number) => {
    setDeletingId(id)
    const res = await apiFetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setWords(w => w.filter(v => v.id !== id))
      fetchStats()
    }
    setDeletingId(null)
  }

  // Review (flashcard answer)
  const handleReview = async (id: number, correct: boolean) => {
    await apiFetch(`/api/vocabulary/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ correct }),
    })
  }

  // After flashcard session ends, refresh
  const handleFlashcardClose = () => {
    setShowFlashcard(false)
    fetchWords()
    fetchStats()
    fetchReviewWords()
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!session?.user) return null

  const masteryLabels = [0, 1, 2, 3].map(n => ({ level: n, label: t(`mastery.${n}` as any), ...MASTERY_COLORS[n] }))
  const totalStats = stats?.total ?? 0

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <BookOpen size={24} className="text-[var(--primary)]" />
            {t('title')}
          </h1>
          <p className="text-[var(--text2)] text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {reviewWords.length > 0 && (
            <button
              onClick={() => setShowFlashcard(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all shadow-sm"
            >
              <RotateCcw size={16} />
              {t('reviewButton')} ({reviewWords.length})
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-[var(--primary)] bg-[var(--primary)]10 border border-[var(--primary)]30 hover:bg-[var(--primary)]20 transition-all"
            style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)' }}
          >
            <Plus size={16} />
            {t('addButton')}
          </button>
        </div>
      </div>

      {/* ── Stats section ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {masteryLabels.map(({ level, label, bg, text, dot }) => {
          const count = stats?.by_mastery?.[level] ?? 0
          const pct = totalStats > 0 ? Math.round((count / totalStats) * 100) : 0
          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: level * 0.06 }}
              className={`rounded-2xl border p-4 ${bg} ${MASTERY_COLORS[level].border}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${text}`}>{label}</span>
              </div>
              <p className={`text-2xl font-bold ${text}`}>{statsLoading ? '–' : count}</p>
              {!statsLoading && totalStats > 0 && (
                <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: dot }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + level * 0.06, duration: 0.5 }}
                  />
                </div>
              )}
              <p className="text-xs text-[var(--text3)] mt-1">{statsLoading ? '' : `${pct}%`}</p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
        {/* Search */}
        <div className="flex-1 relative w-full sm:w-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('filters.search')}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] text-sm focus:outline-none focus:border-[var(--primary)] transition-all"
          />
        </div>

        {/* Language filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text3)]" />
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterLang('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterLang === '' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)]'
              }`}
            >
              {t('filters.allLangs')}
            </button>
            {LANG_OPTS.map(l => (
              <button
                key={l}
                onClick={() => setFilterLang(filterLang === l ? '' : l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterLang === l ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)]'
                }`}
              >
                {LANG_FLAGS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Mastery filter */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterMastery('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMastery === '' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)]'
            }`}
          >
            {t('filters.allLevels')}
          </button>
          {[0, 1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setFilterMastery(filterMastery === String(n) ? '' : String(n))}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                filterMastery === String(n)
                  ? 'bg-[var(--primary)] text-white'
                  : `${MASTERY_COLORS[n].bg} ${MASTERY_COLORS[n].text} hover:opacity-80`
              }`}
              title={t(`mastery.${n}` as any)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { fetchWords(); fetchStats(); fetchReviewWords() }}
          className="p-2 rounded-xl bg-[var(--surface2)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface3)] transition-all"
          title={t('filters.refresh')}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Word list ── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : words.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <BookOpen size={40} className="text-[var(--text3)]" />
            <p className="text-[var(--text2)] font-medium">{t('empty.title')}</p>
            <p className="text-[var(--text3)] text-sm">{t('empty.subtitle')}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all"
            >
              <Plus size={15} /> {t('addButton')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            <AnimatePresence>
              {words.map((word, i) => {
                const mc = MASTERY_COLORS[word.mastery_level] ?? MASTERY_COLORS[0]
                return (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface2)] transition-all group"
                  >
                    {/* Mastery dot */}
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: mc.dot }} />

                    {/* Lang flag */}
                    <span className="text-lg flex-shrink-0">{LANG_FLAGS[word.language] || '🌐'}</span>

                    {/* Word info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--text)] text-sm">{word.word}</span>
                        <span className="text-[var(--text3)] text-xs">→</span>
                        <span className="text-[var(--text2)] text-sm">{word.translation}</span>
                      </div>
                      {word.context_sentence && (
                        <p className="text-xs text-[var(--text3)] italic mt-0.5 truncate">"{word.context_sentence}"</p>
                      )}
                    </div>

                    {/* Mastery badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:inline-flex ${mc.bg} ${mc.text}`}>
                      {t(`mastery.${word.mastery_level}` as any)}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(word.id)}
                      disabled={deletingId === word.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[#ef4444] hover:bg-[#ef444415] transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-50"
                      title={t('deleteWord')}
                    >
                      {deletingId === word.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Count info ── */}
      {!loading && words.length > 0 && (
        <p className="text-xs text-[var(--text3)] mt-3 text-right">
          {t('wordCount', { count: words.length })}
        </p>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddWordModal
            onAdd={handleAddWord}
            onClose={() => setShowAddModal(false)}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFlashcard && reviewWords.length > 0 && (
          <FlashcardMode
            words={reviewWords}
            onReview={handleReview}
            onClose={handleFlashcardClose}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
