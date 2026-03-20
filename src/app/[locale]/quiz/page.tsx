/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, CheckCircle, XCircle, Clock, Star, Flame, History,
  ChevronRight, RotateCcw, Trophy, Loader2, BookOpen, Lightbulb,
  PenLine, AlignLeft
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'
import { useLocale } from 'next-intl'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number
  type: 'translate' | 'fill_blank' | 'grammar' | 'vocabulary'
  question: string
  options: string[]
  correctAnswer?: string
}

interface Quiz {
  id: number
  language: string
  date: string
  questions: QuizQuestion[]
  alreadyAttempted?: boolean
}

interface QuizResult {
  score: number
  total: number
  xpEarned: number
  answers: Record<string, { given: string; correct: string; isCorrect: boolean }>
  completedAt: string
}

interface HistoryEntry {
  id: number
  quizId: number
  score: number
  total: number
  xpEarned: number
  date: string
  language: string
}

interface HistoryData {
  attempts: HistoryEntry[]
  streak: number
  bestScore: number
  totalCompleted: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUESTION_TYPE_ICON: Record<string, React.ElementType> = {
  translate: BookOpen,
  fill_blank: PenLine,
  grammar: AlignLeft,
  vocabulary: Lightbulb,
}

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionTypeTag({ type, t }: { type: string; t: any }) {
  const Icon = QUESTION_TYPE_ICON[type] || Lightbulb
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
    >
      <Icon size={11} />
      {t(`questionType.${type}`)}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { data: session, status } = useSession()
  const t = useTranslations('QuizPage')
  const locale = useLocale()

  // Tab state
  const [activeTab, setActiveTab] = useState<'quiz' | 'history'>('quiz')

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loadingQuiz, setLoadingQuiz] = useState(true)
  const [quizError, setQuizError] = useState<string | null>(null)

  // In-progress state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Results state
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loadingResult, setLoadingResult] = useState(false)

  // History state
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
  }, [status])

  // Load daily quiz
  const loadQuiz = useCallback(async () => {
    setLoadingQuiz(true)
    setQuizError(null)
    try {
      const res = await apiFetch(`/api/quizzes/daily?language=${locale}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setQuiz(data)
      // If already attempted, load results immediately
      if (data.alreadyAttempted && data.id) {
        setLoadingResult(true)
        try {
          const rRes = await apiFetch(`/api/quizzes/${data.id}/results`)
          if (rRes.ok) {
            const rData = await rRes.json()
            setResult(rData)
          }
        } finally {
          setLoadingResult(false)
        }
      }
    } catch {
      setQuizError(t('errorLoad'))
    } finally {
      setLoadingQuiz(false)
    }
  }, [locale, t])

  useEffect(() => {
    if (status === 'authenticated') {
      loadQuiz()
    }
  }, [status, loadQuiz])

  // Load history when tab changes
  useEffect(() => {
    if (activeTab === 'history' && !history && status === 'authenticated') {
      setLoadingHistory(true)
      apiFetch('/api/quizzes/history')
        .then(r => r.json())
        .then(d => setHistory(d))
        .catch(() => setHistory(null))
        .finally(() => setLoadingHistory(false))
    }
  }, [activeTab, history, status])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectOption = (option: string) => {
    if (selected !== null) return
    setSelected(option)
  }

  const handleNext = () => {
    if (selected === null || !quiz) return
    const newAnswers = { ...answers, [String(currentIndex)]: selected }
    setAnswers(newAnswers)

    if (currentIndex < quiz.questions.length - 1) {
      setDirection(1)
      setCurrentIndex(i => i + 1)
      setSelected(null)
    } else {
      // Submit
      handleSubmit(newAnswers)
    }
  }

  const handleSubmit = async (finalAnswers: Record<string, string>) => {
    if (!quiz) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers: finalAnswers }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setResult(data)
    } catch {
      setQuizError(t('errorSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render guards ───────────────────────────────────────────────────────────

  if (status === 'loading' || loadingQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('loading')}</p>
        </motion.div>
      </div>
    )
  }

  if (quizError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center p-8 rounded-2xl max-w-sm mx-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <XCircle size={40} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>{quizError}</p>
          <button
            onClick={loadQuiz}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            <RotateCcw size={14} />
            {t('retry')}
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div className="py-8 px-4 text-center" style={{ background: 'linear-gradient(135deg, var(--surface), var(--bg))' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
          >
            <Brain size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{t('title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('subtitle')}</p>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: 'var(--surface2)' }}>
          {(['quiz', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
              style={
                activeTab === tab
                  ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: '0 1px 4px var(--shadow)' }
                  : { color: 'var(--text3)' }
              }
            >
              {tab === 'quiz' ? <Brain size={15} /> : <History size={15} />}
              {t(`tab.${tab}`)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'quiz' ? (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {result || (quiz?.alreadyAttempted && loadingResult) ? (
                <ResultView
                  result={result}
                  quiz={quiz}
                  loading={loadingResult}
                  t={t}
                />
              ) : quiz ? (
                <QuizView
                  quiz={quiz}
                  currentIndex={currentIndex}
                  selected={selected}
                  direction={direction}
                  submitting={submitting}
                  onSelect={handleSelectOption}
                  onNext={handleNext}
                  t={t}
                />
              ) : null}
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HistoryView history={history} loading={loadingHistory} t={t} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Quiz View ────────────────────────────────────────────────────────────────

function QuizView({
  quiz,
  currentIndex,
  selected,
  direction,
  submitting,
  onSelect,
  onNext,
  t,
}: {
  quiz: Quiz
  currentIndex: number
  selected: string | null
  direction: number
  submitting: boolean
  onSelect: (o: string) => void
  onNext: () => void
  t: any
}) {
  const question = quiz.questions[currentIndex]
  const total = quiz.questions.length
  const progress = ((currentIndex) / total) * 100
  const isLast = currentIndex === total - 1

  return (
    <div>
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
          <span>{t('questionOf', { current: currentIndex + 1, total })}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--primary)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          className="rounded-2xl p-6 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Type tag */}
          <div className="mb-3">
            <QuestionTypeTag type={question.type} t={t} />
          </div>

          {/* Question text */}
          <p className="text-lg font-semibold mb-5 leading-snug" style={{ color: 'var(--text)' }}>
            {question.question}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {question.options.map((option, i) => {
              const isSelected = selected === option
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(option)}
                  disabled={selected !== null}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    background: isSelected
                      ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
                      : 'var(--surface2)',
                    border: isSelected
                      ? '2px solid var(--primary)'
                      : '2px solid transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text)',
                    cursor: selected !== null ? 'default' : 'pointer',
                  }}
                >
                  <span className="font-bold mr-2" style={{ color: isSelected ? 'var(--primary)' : 'var(--text3)' }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {option}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={selected === null || submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-150"
        style={{
          background: selected !== null ? 'var(--primary)' : 'var(--surface3)',
          color: selected !== null ? 'white' : 'var(--text3)',
          cursor: selected !== null ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" />{t('submitting')}</>
        ) : isLast ? (
          <><CheckCircle size={16} />{t('finish')}</>
        ) : (
          <><ChevronRight size={16} />{t('next')}</>
        )}
      </motion.button>
    </div>
  )
}

// ─── Result View ──────────────────────────────────────────────────────────────

function ResultView({
  result,
  quiz,
  loading,
  t,
}: {
  result: QuizResult | null
  quiz: Quiz | null
  loading: boolean
  t: any
}) {
  if (loading || !result) {
    return (
      <div className="text-center py-16">
        <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('loading')}</p>
      </div>
    )
  }

  const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
  const isPerfect = percentage === 100
  const isGood = percentage >= 70

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Score card */}
      <div
        className="rounded-2xl p-6 text-center mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
          style={{
            background: isPerfect
              ? '#f59e0b20'
              : isGood
              ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
              : '#ef444420',
          }}
        >
          {isPerfect ? (
            <Trophy size={30} style={{ color: '#f59e0b' }} />
          ) : isGood ? (
            <Star size={30} style={{ color: 'var(--primary)' }} />
          ) : (
            <Brain size={30} style={{ color: '#ef4444' }} />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
          {result.score}/{result.total}
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--text3)' }}>
          {isPerfect ? t('result.perfect') : isGood ? t('result.good') : t('result.tryAgain')}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
            <Star size={14} fill="#f59e0b" />
            <span className="font-bold">{percentage}%</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
            <Zap size={14} />
            <span className="font-bold">+{result.xpEarned} XP</span>
          </div>
        </div>
      </div>

      {/* Corrections */}
      {result.answers && Object.keys(result.answers).length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
          <div
            className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            {t('result.corrections')}
          </div>
          {Object.entries(result.answers).map(([idx, ans], i) => {
            const question = quiz?.questions?.[Number(idx)]
            return (
              <div
                key={idx}
                className="px-4 py-3 flex gap-3"
                style={{
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {ans.isCorrect ? (
                    <CheckCircle size={16} style={{ color: '#10b981' }} />
                  ) : (
                    <XCircle size={16} style={{ color: '#ef4444' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {question && (
                    <p className="text-xs mb-1 line-clamp-2" style={{ color: 'var(--text2)' }}>
                      {question.question}
                    </p>
                  )}
                  {!ans.isCorrect && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <span style={{ color: '#ef4444' }}>
                        <span style={{ color: 'var(--text3)' }}>{t('result.yourAnswer')}: </span>
                        {ans.given}
                      </span>
                      <span style={{ color: '#10b981' }}>
                        <span style={{ color: 'var(--text3)' }}>{t('result.correctAnswer')}: </span>
                        {ans.correct}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Already attempted notice */}
      {quiz?.alreadyAttempted && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }}
        >
          <Clock size={15} />
          {t('alreadyAttempted')}
        </div>
      )}
    </motion.div>
  )
}

// ─── Zap icon inline (not in lucide older builds) ─────────────────────────────

function Zap({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// ─── History View ─────────────────────────────────────────────────────────────

function HistoryView({
  history,
  loading,
  t,
}: {
  history: HistoryData | null
  loading: boolean
  t: any
}) {
  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('loading')}</p>
      </div>
    )
  }

  if (!history) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
        <History size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('history.empty')}</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t('history.streak'), value: `${history.streak}`, icon: Flame, color: '#f97316' },
          { label: t('history.best'), value: `${history.bestScore}%`, icon: Trophy, color: '#f59e0b' },
          { label: t('history.total'), value: `${history.totalCompleted}`, icon: CheckCircle, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Icon size={20} className="mx-auto mb-1" style={{ color }} />
            <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{value}</p>
            <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Attempt list */}
      {history.attempts.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text3)' }}>
          <History size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t('history.noAttempts')}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
          >
            {t('history.pastAttempts')}
          </div>
          {history.attempts.map((entry, i) => {
            const pct = entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0
            const good = pct >= 70
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="px-4 py-3 flex items-center gap-3"
                style={{
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: good ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : '#ef444415',
                    color: good ? 'var(--primary)' : '#ef4444',
                  }}
                >
                  {pct}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {entry.score}/{entry.total} {t('history.correct')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>
                    {new Date(entry.date).toLocaleDateString()} · +{entry.xpEarned} XP
                  </p>
                </div>
                {good ? (
                  <Star size={16} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                ) : (
                  <Brain size={16} style={{ color: 'var(--text3)' }} />
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
