'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { OnlineUser } from './types'
import { resolveImageSrc } from './utils'

export interface OnlineUsersListProps {
  onlineUsers: OnlineUser[]
  onSendPrivateInvite: (user: OnlineUser) => void
}

export default function OnlineUsersList({ onlineUsers, onSendPrivateInvite }: OnlineUsersListProps) {
  const t = useTranslations('ChatPage')

  return (
    <>
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 3).map(u => (
          <button key={u.userId} onClick={() => onSendPrivateInvite(u)} title={t('privateInvite.withUser', { name: u.name })}
            className="w-6 h-6 rounded-full flex-shrink-0 ring-2 overflow-hidden"
            style={{ ringColor: 'var(--surface)' } as React.CSSProperties}>
            {resolveImageSrc(u.image)
              ? <img src={resolveImageSrc(u.image)} alt={u.name} className="w-6 h-6 object-cover" />
              : <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>{u.name[0]}</div>}
          </button>
        ))}
      </div>
      {onlineUsers.length > 0 && (
        <span className="text-[11px] font-medium" style={{ color: 'var(--text3)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1" />
          {t('header.online', { count: onlineUsers.length })}
        </span>
      )}
    </>
  )
}
