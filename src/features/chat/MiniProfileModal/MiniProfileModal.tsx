/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import type { MiniProfile, MiniProfileFollowState } from '@/lib/types/chat'
import { LEVEL_COLORS } from '@/lib/constants/chat'
import { resolveImageSrc } from '@/lib/utils/format'
import { OnlineIndicator, usePresence, PresenceBadge } from '@/components/OnlineIndicator'

export interface MiniProfileModalProps {
  miniProfile: MiniProfile | null
  miniProfileFollow: MiniProfileFollowState
  sessionUserId: string | number | undefined
  onClose: () => void
  onToggleFollow: () => void
  preventMediaActions: (e: React.SyntheticEvent) => void
}

export default function MiniProfileModal({
  miniProfile,
  miniProfileFollow,
  sessionUserId,
  onClose,
  onToggleFollow,
  preventMediaActions,
}: MiniProfileModalProps) {
  const t = useTranslations('ChatPage')
  const locale = useLocale()
  const presence = usePresence(miniProfile?.id ?? null, 30_000)

  return (
    <AnimatePresence>
      {miniProfile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
            className="rounded-3xl overflow-hidden max-w-xs w-full" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="h-16" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }} />
            <div className="px-5 pb-5">
              <div className="-mt-8 mb-3 relative inline-block">
                {resolveImageSrc(miniProfile.image)
                  ? <img src={resolveImageSrc(miniProfile.image)} alt={miniProfile.name} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="w-14 h-14 rounded-full border-4 object-cover" style={{ borderColor: 'var(--surface)', WebkitTouchCallout: 'none', userSelect: 'none' } as any} />
                  : <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white border-4"
                    style={{ background: 'var(--primary)', borderColor: 'var(--surface)' }}>{miniProfile.name[0]}</div>}
                {presence && (
                  <OnlineIndicator
                    isOnline={presence.isOnline}
                    size={13}
                    className="absolute bottom-0.5 right-0.5"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold" style={{ color: 'var(--text)' }}>{miniProfile.name}</h4>
                {miniProfile.country && <span className="text-sm">{miniProfile.country}</span>}
              </div>
              {presence && (
                <PresenceBadge
                  presence={presence}
                  locale={locale}
                  labels={{
                    online: t('miniProfile.online'),
                    lastSeen: t('miniProfile.lastSeen'),
                  }}
                  className="mb-2"
                />
              )}
              {miniProfileFollow.followsYou && String(miniProfile.id) !== String(sessionUserId) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full inline-block mb-2" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {t('miniProfile.followsYou')}
                </span>
              )}
              {miniProfile.level && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block mb-2"
                  style={{ background: `${LEVEL_COLORS[miniProfile.level] || 'var(--primary)'}20`, color: LEVEL_COLORS[miniProfile.level] || 'var(--primary)' }}>
                  {t('miniProfile.level', { level: miniProfile.level })}
                </span>
              )}
              <div className="flex items-center gap-2 mb-3 text-[11px]" style={{ color: 'var(--text3)' }}>
                <span>{t('miniProfile.followersCount', { count: miniProfileFollow.followersCount })}</span>
                <span>{'\u00B7'}</span>
                <span>{t('miniProfile.followingCount', { count: miniProfileFollow.followingCount })}</span>
              </div>
              {String(miniProfile.id) !== String(sessionUserId) && (
                <button
                  onClick={onToggleFollow}
                  disabled={miniProfileFollow.loading}
                  className="w-full mb-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
                  style={{
                    background: miniProfileFollow.isFollowing ? 'var(--surface2)' : 'var(--primary)',
                    color: miniProfileFollow.isFollowing ? 'var(--text2)' : '#fff',
                    border: miniProfileFollow.isFollowing ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {miniProfileFollow.loading
                    ? t('miniProfile.loading')
                    : miniProfileFollow.isFollowing
                      ? t('miniProfile.unfollow')
                      : t('miniProfile.follow')}
                </button>
              )}
              {miniProfile.bio && <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text2)' }}>{miniProfile.bio}</p>}
              <div className="flex flex-wrap gap-1 text-[11px] mb-3">
                {miniProfile.nativelang && <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>{'\u{1F5E3}'} {t('miniProfile.nativelang', { lang: miniProfile.nativelang })}</span>}
                {miniProfile.targetLang && <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{'\u{1F3AF}'} {t('miniProfile.targetLang', { lang: miniProfile.targetLang })}</span>}
              </div>
              {Array.isArray(miniProfile.interests) && miniProfile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {miniProfile.interests.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-full py-3 text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}>{t('miniProfile.close')}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
