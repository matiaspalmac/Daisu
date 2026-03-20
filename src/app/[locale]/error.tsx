'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from '@/i18n/routing'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('ErrorPages')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[#ef444420]">
          <AlertTriangle size={32} className="text-[#ef4444]" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">{t('error.title')}</h1>
        <p className="text-sm mb-2 text-[var(--text3)]">{t('error.description')}</p>
        {error.digest && (
          <p className="text-xs mb-6 font-mono text-[var(--text3)]">ID: {error.digest}</p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[var(--primary)]"
          >
            <RotateCcw size={16} />
            {t('error.retry')}
          </button>
          <Link href="/">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[var(--surface)] text-[var(--text)] border-[var(--border)]">
              <Home size={16} />
              {t('error.home')}
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
