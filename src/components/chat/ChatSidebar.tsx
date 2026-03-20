/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { Search, Plus, Loader2, Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  ChatRoom,
  LANG_FLAGS,
  LEVEL_COLORS,
  TARGET_LANG_CODES,
  TARGET_LANG_FLAGS,
} from './types'

function RoomItem({ room, selected, onSelect }: { room: ChatRoom; selected: boolean; onSelect: () => void }) {
  const levelColor = LEVEL_COLORS[room.level || ''] || 'var(--primary)'
  const isPrivate = room.type === 'private'
  return (
    <button onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left mb-0.5 transition-all md:hover:bg-[var(--surface2)]"
      style={{ background: selected ? 'var(--primary-light)' : 'transparent' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: selected ? 'var(--primary)' : 'var(--surface3)' }}>
        {room.language ? LANG_FLAGS[room.language] : '#'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate" style={{ color: selected ? 'var(--primary)' : 'var(--text)' }}>{room.name}</p>
        <div className="flex items-center gap-1 flex-wrap">
          {room.level && <span className="text-[9px] font-bold" style={{ color: levelColor }}>{room.level}</span>}
          {isPrivate && (
            <span className="text-[8px] font-bold px-1 rounded" style={{ background: 'var(--surface3)', color: 'var(--text3)' }}>
              🔒
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export interface ChatSidebarProps {
  sidebarOpen: boolean
  searchTerm: string
  onSearchTermChange: (v: string) => void
  filteredLang: string
  onFilteredLangChange: (v: string) => void
  targetLang: string
  onShowLangSelector: () => void
  isLoadingRooms: boolean
  defaultRooms: ChatRoom[]
  customRooms: ChatRoom[]
  selectedRoomId: string | undefined
  onJoinRoom: (room: ChatRoom) => void
  onShowCreateRoom: () => void
  pendingInvitationsCount?: number
  onShowInvitations?: () => void
}

export default function ChatSidebar({
  sidebarOpen,
  searchTerm,
  onSearchTermChange,
  filteredLang,
  onFilteredLangChange,
  targetLang,
  onShowLangSelector,
  isLoadingRooms,
  defaultRooms,
  customRooms,
  selectedRoomId,
  onJoinRoom,
  onShowCreateRoom,
  pendingInvitationsCount = 0,
  onShowInvitations,
}: ChatSidebarProps) {
  const t = useTranslations('ChatPage')

  return (
    <div className={`
      fixed md:static inset-y-0 left-0 z-40 md:z-auto flex flex-col
      transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `} style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', height: '100%' }}>

      {/* Sidebar header */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('sidebar.title')}</h2>
          <div className="flex items-center gap-1.5">
            {/* Invitations bell */}
            {onShowInvitations && (
              <button
                onClick={onShowInvitations}
                title={t('invitations.title')}
                className="relative p-1.5 rounded-full transition-colors"
                style={{ background: pendingInvitationsCount > 0 ? 'var(--primary-light)' : 'transparent', color: pendingInvitationsCount > 0 ? 'var(--primary)' : 'var(--text3)' }}
              >
                <Bell size={14} />
                {pendingInvitationsCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: 'var(--primary)' }}
                  >
                    {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                  </span>
                )}
              </button>
            )}
            {targetLang && (
              <button onClick={onShowLangSelector} title={t('sidebar.changeLang')}
                className="text-sm px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11 }}>
                {LANG_FLAGS[targetLang]} {targetLang.toUpperCase()}
              </button>
            )}
            {!targetLang && (
              <button onClick={onShowLangSelector} title={t('sidebar.chooseLang')}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ color: 'var(--text3)', borderColor: 'var(--border)', fontSize: 10 }}>
                {'\u{1F3AF}'} {t('sidebar.chooseLang')}
              </button>
            )}
          </div>
        </div>
        {/* Search */}
        <div className="px-3 pb-2 relative">
          <Search size={12} className="absolute left-5.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input value={searchTerm} onChange={e => onSearchTermChange(e.target.value)} placeholder={t('sidebar.placeholder')}
            className="w-full pl-7 pr-3 py-1.5 rounded-full text-xs outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
        {/* Lang filter chips */}
        <div className="flex gap-1.5 px-3 pb-3 flex-wrap">
          {[{ code: '', flag: '\u{1F310}', labelKey: 'sidebar.filter.all' as const }, ...TARGET_LANG_CODES.map(c => ({ code: c, flag: TARGET_LANG_FLAGS[c], labelKey: `sidebar.filter.${c}` as const }))].map(l => (
            <button key={l.code} onClick={() => onFilteredLangChange(l.code)}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
              style={{ background: filteredLang === l.code ? 'var(--primary)' : 'var(--surface3)', color: filteredLang === l.code ? '#fff' : 'var(--text2)' }}>
              {l.flag} {t(l.labelKey as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto py-2 px-2" style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}>
        {isLoadingRooms ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
        ) : (
          <>
            {defaultRooms.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text3)' }}>{t('sidebar.sections.rooms')}</p>
                {defaultRooms.map(room => <RoomItem key={room.id} room={room} selected={selectedRoomId === room.id} onSelect={() => onJoinRoom(room)} />)}
              </div>
            )}
            {customRooms.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text3)' }}>{t('sidebar.sections.custom')}</p>
                {customRooms.map(room => <RoomItem key={room.id} room={room} selected={selectedRoomId === room.id} onSelect={() => onJoinRoom(room)} />)}
              </div>
            )}
            <button onClick={onShowCreateRoom}
              className="w-full flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors md:hover:brightness-95"
              style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
              <Plus size={13} /> {t('sidebar.newRoom')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
