'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface LeaderboardEntry {
  id: number
  name: string
  image: string
  xp: number
  level: number
}

const RANK_COLORS: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: '#f59e0b20', text: '#f59e0b', icon: '🥇' },
  2: { bg: '#94a3b820', text: '#94a3b8', icon: '🥈' },
  3: { bg: '#cd7c3a20', text: '#cd7c3a', icon: '🥉' },
}

export default function LeaderboardClient() {
  const t = useTranslations('LeaderboardPage')
  const { data: session } = useSession()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    apiFetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setEntries(d)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const currentUserId = (session?.user as any)?.id

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="py-10 px-4 text-center" style={{ background: 'linear-gradient(135deg, var(--surface), var(--bg))' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
            <Trophy size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('subtitle')}</p>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Top 3 podium */}
        {!loading && !error && entries.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {[entries[1], entries[0], entries[2]].map((entry, i) => {
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3
              const rankStyle = RANK_COLORS[rank] || { bg: 'var(--surface2)', text: 'var(--text2)', icon: `${rank}` }
              const isCurrentUser = Number(currentUserId) === entry.id
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`flex flex-col items-center p-3 rounded-2xl text-center ${rank === 1 ? 'pt-4' : ''}`}
                  style={{
                    background: 'var(--surface)',
                    border: isCurrentUser ? '2px solid var(--primary)' : `1px solid var(--border)`,
                  }}
                >
                  <div className="text-2xl mb-1">{rankStyle.icon}</div>
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mb-2">
                    {entry.image ? (
                      <Image src={entry.image} alt={entry.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white" style={{ background: 'var(--primary)' }}>
                        {entry.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate w-full" style={{ color: 'var(--text)' }}>{entry.name}</p>
                  {isCurrentUser && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-0.5" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                      {t('you')}
                    </span>
                  )}
                  <p className="text-[10px] font-bold mt-1" style={{ color: rankStyle.text }}>
                    {t('xpValue', { xp: entry.xp })}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>Lv. {entry.level}</p>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Full list */}
        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            <p className="text-sm">{t('loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('error')}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_80px_80px] items-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
              <span>{t('rank')}</span>
              <span>{t('user')}</span>
              <span className="text-right">{t('level')}</span>
              <span className="text-right">{t('xp')}</span>
            </div>

            {entries.map((entry, index) => {
              const rank = index + 1
              const rankStyle = RANK_COLORS[rank]
              const isCurrentUser = Number(currentUserId) === entry.id

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="grid grid-cols-[40px_1fr_80px_80px] items-center px-4 py-3"
                  style={{
                    background: isCurrentUser
                      ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                      : index % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {/* Rank */}
                  <div>
                    {rankStyle ? (
                      <span className="text-lg">{rankStyle.icon}</span>
                    ) : (
                      <span className="text-sm font-bold" style={{ color: 'var(--text3)' }}>{rank}</span>
                    )}
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {entry.image ? (
                        <Image src={entry.image} alt={entry.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
                          {entry.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{entry.name}</p>
                      {isCurrentUser && (
                        <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>{t('you')}</span>
                      )}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                      {entry.level}
                    </span>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: rankStyle ? rankStyle.text : 'var(--text2)' }}>
                      {entry.xp.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
