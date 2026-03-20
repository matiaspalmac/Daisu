'use client'

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFound() {
  const t = useTranslations('ErrorPages')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-black mb-2 text-[var(--primary)]">404</div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">{t('notFound.title')}</h1>
        <p className="text-sm mb-8 text-[var(--text3)]">{t('notFound.description')}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[var(--primary)]">
              <Home size={16} />
              {t('notFound.home')}
            </button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[var(--surface)] text-[var(--text)] border-[var(--border)]"
          >
            <ArrowLeft size={16} />
            {t('notFound.back')}
          </button>
          <Link href="/search">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border bg-[var(--surface)] text-[var(--text)] border-[var(--border)]">
              <Search size={16} />
              {t('notFound.search')}
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
