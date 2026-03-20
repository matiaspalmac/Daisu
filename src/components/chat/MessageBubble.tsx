/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useRef, useState } from 'react'
import { Smile, Flag, Reply, User as UserIcon, Pencil, Trash2, Check, X, Languages, ChevronDown, PenLine } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Message, Reaction, PeerCorrection } from './types'
import { resolveImageSrc } from './utils'
import { useMessageTranslation } from '@/hooks/useMessageTranslation'
import { SubmitCorrectionModal, ViewCorrectionsModal } from './PeerCorrectionModal'

export interface MessageBubbleProps {
  msg: Message
  showHeader: boolean
  isMe: boolean
  displayName: string
  senderRole: string
  effectsEnabled: boolean
  textOnlyMode: boolean
  shouldLoadImages: boolean
  chatAvatarSize: number
  chatFontSize: string
  currentBubbleColors: { mine: string; other: string }
  showEmojiPicker: string | null
  emojiRecents: string[]
  moderationMap: Record<string, { muted: boolean; blocked: boolean }>
  sessionUserId: string | number | undefined
  sessionUserName?: string
  roomId: string
  getUserRoleInRoom: (userId: string | number) => string
  onFetchProfile: (userId: string | number) => void
  onSetReplyTarget: (target: { id: string; username: string; preview: string }) => void
  onSetShowEmojiPicker: (messageId: string | null) => void
  onHandleReact: (messageId: string, emoji: string) => void
  onSetNicknameForMessage: (msg: Message) => void
  onUpdateModeration: (targetUserId: string | number, next: { muted?: boolean; blocked?: boolean }) => void
  onHandleBanUser: (userId: string | number, reason: string, durationMinutes: number) => void
  onSetShowReport: (messageId: string) => void
  onSetReportReason: (reason: string) => void
  preventMediaActions: (e: React.SyntheticEvent) => void
  onEditMessage: (messageId: string, newContent: string) => void
  onDeleteMessage: (messageId: string) => void
  onCorrectionSubmitted: (messageId: string, correction: PeerCorrection) => void
  onEmitPeerCorrect: (payload: { messageId: string; correctedText: string; explanation: string; roomId: string }) => void
  nativeLang?: string
}

export default function MessageBubble({
  msg,
  showHeader,
  isMe,
  displayName,
  senderRole,
  effectsEnabled,
  textOnlyMode,
  shouldLoadImages,
  chatAvatarSize,
  chatFontSize,
  currentBubbleColors,
  showEmojiPicker,
  emojiRecents,
  moderationMap,
  sessionUserId,
  sessionUserName,
  roomId,
  getUserRoleInRoom,
  onFetchProfile,
  onSetReplyTarget,
  onSetShowEmojiPicker,
  onHandleReact,
  onSetNicknameForMessage,
  onUpdateModeration,
  onHandleBanUser,
  onSetShowReport,
  onSetReportReason,
  preventMediaActions,
  onEditMessage,
  onDeleteMessage,
  onCorrectionSubmitted,
  onEmitPeerCorrect,
  nativeLang,
}: MessageBubbleProps) {
  const t = useTranslations('ChatPage')
  const touchStartXRef = useRef<number | null>(null)
  const showStaffShield = ['owner', 'mod'].includes(senderRole)

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(msg.content)

  // Peer correction modals
  const [showSubmitCorrection, setShowSubmitCorrection] = useState(false)
  const [showViewCorrections, setShowViewCorrections] = useState(false)

  // Inline translation
  const { state: translationState, translate, toggleVisible } = useMessageTranslation(nativeLang)

  // Can edit if own message and within 15 minutes
  const canEdit = isMe && !msg.isDeleted && (() => {
    if (!msg.timestamp) return false
    const sentAt = new Date(msg.timestamp.toString().replace(' ', 'T')).getTime()
    return Date.now() - sentAt < 15 * 60 * 1000
  })()

  // Can delete if own message or if current user is mod/owner
  const canDelete = !msg.isDeleted && (
    isMe ||
    (sessionUserId !== undefined && sessionUserId !== null && ['mod', 'owner'].includes(getUserRoleInRoom(sessionUserId)))
  )

  // Correction count badge
  const correctionCount = msg.corrections?.length ?? 0
  const canCorrect = !isMe && !msg.isDeleted

  const handleStartEdit = () => {
    setEditValue(msg.content)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === msg.content) {
      setIsEditing(false)
      return
    }
    onEditMessage(msg.id, trimmed)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(msg.content)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!window.confirm(t('actions.deleteConfirm'))) return
    onDeleteMessage(msg.id)
  }

  const reactionSummary = (msg.reactions || []).reduce<Record<string, { count: number; reactors: Array<{ userId: string; userImage: string; userName: string }> }>>((acc, reaction) => {
    const key = reaction.emoji
    if (!acc[key]) {
      acc[key] = { count: 0, reactors: [] }
    }
    acc[key].count += 1
    const reactorId = String(reaction.userId)
    if (!acc[key].reactors.some(r => r.userId === reactorId)) {
      acc[key].reactors.push({
        userId: reactorId,
        userImage: resolveImageSrc(reaction.userImage || ''),
        userName: reaction.userName || '',
      })
    }
    return acc
  }, {})

  return (
    <>
      <motion.div
        id={`msg-${msg.id}`}
        initial={effectsEnabled ? { opacity: 0, y: 8 } : false}
        animate={effectsEnabled ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.18 }}
        className={`flex items-end gap-2 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        {!textOnlyMode && (
          <div className="flex-shrink-0" style={{ width: chatAvatarSize + 4, marginBottom: 2 }}>
            <button onClick={() => msg.senderId && onFetchProfile(msg.senderId)} className="block relative" title={`Ver perfil de ${displayName}`}>
              {shouldLoadImages && resolveImageSrc(msg.userImage)
                ? <img src={resolveImageSrc(msg.userImage)} alt={displayName} draggable={false} onContextMenu={preventMediaActions} onDragStart={preventMediaActions} className="rounded-full object-cover" style={{ width: chatAvatarSize, height: chatAvatarSize, border: '2px solid var(--border)', WebkitTouchCallout: 'none', userSelect: 'none' } as any} />
                : <div className="rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ width: chatAvatarSize, height: chatAvatarSize, background: 'var(--primary)', color: '#fff' }}>{displayName[0]}</div>}
              {showStaffShield && (
                <span
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                  style={{ background: senderRole === 'owner' ? '#fbbf24' : '#60a5fa', color: '#fff', border: '1px solid var(--surface)' }}
                >
                  {'\u{1F6E1}'}
                </span>
              )}
            </button>
          </div>
        )}
        {/* Bubble */}
        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
          {showHeader && !isMe && (
            <div className="flex items-center gap-1 mb-0.5 px-1">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text3)' }}>{displayName}</p>
              {msg.senderId && ['mod', 'owner'].includes(getUserRoleInRoom(msg.senderId)) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: getUserRoleInRoom(msg.senderId) === 'owner' ? '#fbbf24' : '#60a5fa',
                    color: getUserRoleInRoom(msg.senderId) === 'owner' ? '#78350f' : '#ffffff'
                  }}>
                  {getUserRoleInRoom(msg.senderId) === 'owner' ? '\u{1F451} OWNER' : '\u{1F6E1}\u{FE0F} MOD'}
                </span>
              )}
            </div>
          )}

          {/* Deleted message placeholder */}
          {msg.isDeleted ? (
            <div className="px-3.5 py-2 text-sm italic opacity-50"
              style={{
                background: 'var(--surface2)',
                color: 'var(--text3)',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: '1px solid var(--border)',
                fontSize: chatFontSize,
              }}>
              {t('messages.deleted')}
            </div>
          ) : isEditing ? (
            /* Inline edit input */
            <div className="flex flex-col gap-1.5 w-full">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                autoFocus
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  border: '1px solid var(--primary)',
                  fontSize: chatFontSize,
                  minWidth: '180px',
                }}
                placeholder={t('actions.editPlaceholder')}
              />
              <div className={`flex gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <button onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: 'var(--primary)' }}>
                  <Check size={11} /> {t('actions.editSave')}
                </button>
                <button onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                  <X size={11} /> {t('actions.editCancel')}
                </button>
              </div>
            </div>
          ) : (
            /* Normal bubble */
            <div className="px-3.5 py-2 text-sm break-words"
              onDoubleClick={() => onSetReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })}
              onTouchStart={(e) => { touchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null }}
              onTouchEnd={(e) => {
                const startX = touchStartXRef.current
                const endX = e.changedTouches?.[0]?.clientX
                if (startX === null || endX === undefined) return
                if (Math.abs(endX - startX) > 70) onSetReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })
              }}
              style={{
                background: isMe ? currentBubbleColors.mine : currentBubbleColors.other,
                color: isMe ? '#fff' : 'var(--text)',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: isMe ? 'none' : '1px solid var(--border)',
                maxWidth: '100%',
                fontSize: chatFontSize,
              }}>
              {msg.replyTo && (
                <div
                  onClick={() => {
                    const el = document.getElementById(`msg-${msg.replyTo?.id}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  className="mb-1 p-2 rounded max-h-20 overflow-hidden cursor-pointer opacity-90 border-l-4"
                  style={{
                    background: isMe ? 'rgba(0,0,0,0.15)' : 'var(--surface2)',
                    color: isMe ? '#ececec' : 'var(--text2)',
                    borderColor: 'var(--primary)',
                    fontSize: chatFontSize === 'large' ? '14px' : '12px',
                  }}>
                  <div className="font-semibold text-[10px] mb-0.5" style={{ color: isMe ? '#fff' : 'var(--primary)' }}>
                    {msg.replyTo.username}
                  </div>
                  <div className="line-clamp-2">{msg.replyTo.content}</div>
                </div>
              )}
              {msg.content}
            </div>
          )}

          {/* Inline translation panel */}
          {!msg.isDeleted && !isEditing && (
            <AnimatePresence>
              {translationState.status === 'loading' && (
                <motion.div
                  key="tl-loading"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 px-3 py-1.5 rounded-xl text-xs italic"
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', maxWidth: '100%', fontSize: chatFontSize === 'large' ? '13px' : '11px' }}
                >
                  {t('translation.loading')}
                </motion.div>
              )}

              {translationState.status === 'done' && translationState.visible && (
                <motion.div
                  key="tl-result"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', maxWidth: '100%' }}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                      {t('translation.label', { lang: translationState.result.to.toUpperCase() })}
                    </span>
                    <button onClick={toggleVisible} className="text-[10px]" style={{ color: 'var(--text3)' }}>
                      {t('translation.hide')}
                    </button>
                  </div>
                  <p className="text-sm break-words" style={{ color: 'var(--text)', fontSize: chatFontSize }}>
                    {translationState.result.translated_text}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>
                    {translationState.result.usage.limit === null
                      ? t('translation.usageUnlimited')
                      : t('translation.usage', {
                          used: translationState.result.usage.used,
                          limit: translationState.result.usage.limit,
                        })}
                  </p>
                </motion.div>
              )}

              {translationState.status === 'done' && !translationState.visible && (
                <motion.button
                  key="tl-collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={toggleVisible}
                  className="mt-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)' }}
                >
                  <Languages size={10} />
                  {t('translation.show')}
                  <ChevronDown size={10} />
                </motion.button>
              )}

              {translationState.status === 'limit_reached' && (
                <motion.div
                  key="tl-limit"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444', maxWidth: '100%', fontSize: chatFontSize === 'large' ? '12px' : '11px' }}
                >
                  {t('translation.limitReached', { limit: translationState.limit })}
                </motion.div>
              )}

              {translationState.status === 'error' && (
                <motion.div
                  key="tl-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#f59e0b', maxWidth: '100%', fontSize: chatFontSize === 'large' ? '12px' : '11px' }}
                >
                  {t('translation.error')}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Edited label */}
          {!msg.isDeleted && msg.editedAt && !isEditing && (
            <p className="text-[10px] mt-0.5 px-1 italic" style={{ color: 'var(--text3)' }}>
              {t('messages.edited')}
            </p>
          )}

          {/* Reactions */}
          {!msg.isDeleted && msg.reactions && msg.reactions.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-0.5 px-1">
              {Object.entries(reactionSummary).map(([emoji, data]) => (
                <button key={emoji} onClick={() => onHandleReact(msg.id, emoji)}
                  className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span>{emoji}</span>
                  {data.reactors.length > 0 && (
                    <span className="flex items-center -space-x-1.5 ml-0.5">
                      {data.reactors.slice(0, 3).map((reactor) => (
                        reactor.userImage
                          ? <img key={reactor.userId} src={reactor.userImage} alt={reactor.userName || 'user'} className="w-3.5 h-3.5 rounded-full object-cover ring-1" style={{ ringColor: 'var(--surface)' } as any} />
                          : <span key={reactor.userId} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1" style={{ background: 'var(--primary)', ringColor: 'var(--surface)' } as any}>
                            {(reactor.userName || '?')[0]}
                          </span>
                      ))}
                    </span>
                  )}
                  {data.count > 1 && <span style={{ color: 'var(--text3)' }}>{data.count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Corrections badge */}
          {!msg.isDeleted && correctionCount > 0 && (
            <button
              onClick={() => setShowViewCorrections(true)}
              className="flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: '#3b82f615',
                color: '#3b82f6',
                border: '1px solid #3b82f640',
              }}
              title={t('corrections.badgeTooltip')}
            >
              <PenLine size={10} />
              {t('corrections.badge', { count: correctionCount })}
            </button>
          )}

          {/* Time */}
          {showHeader && msg.timestamp && (
            <p className="text-[10px] mt-0.5 px-1" style={{ color: 'var(--text3)' }}>
              {new Date(msg.timestamp.toString().replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Action buttons (hover) */}
        {!isEditing && (
          <div className={`flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 flex-wrap ${isMe ? 'flex-row-reverse' : ''}`}>
            {!msg.isDeleted && (
              <>
                <button onClick={() => onSetReplyTarget({ id: msg.id, username: displayName, preview: msg.content.slice(0, 80) })}
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('messages.quickReply')}>
                  <Reply size={12} style={{ color: 'var(--text3)' }} />
                </button>
                <button onClick={() => onSetShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                  <Smile size={12} style={{ color: 'var(--text3)' }} />
                </button>
                <button onClick={() => onSetNicknameForMessage(msg)}
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.nickname')}>
                  <UserIcon size={11} style={{ color: 'var(--text3)' }} />
                </button>

                {/* Translate button — only when nativeLang is known */}
                {nativeLang && msg.content && (
                  <button
                    onClick={() => {
                      if (translationState.status === 'done') {
                        toggleVisible()
                      } else {
                        translate(msg.content)
                      }
                    }}
                    disabled={translationState.status === 'loading'}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: translationState.status === 'done'
                        ? 'var(--primary)'
                        : translationState.status === 'limit_reached'
                          ? '#ef444420'
                          : 'var(--surface2)',
                      opacity: translationState.status === 'loading' ? 0.5 : 1,
                      cursor: translationState.status === 'loading' ? 'wait' : 'pointer',
                    }}
                    title={t('actions.translateTitle')}
                  >
                    <Languages size={11} style={{ color: translationState.status === 'done' ? '#fff' : 'var(--text3)' }} />
                  </button>
                )}
              </>
            )}

            {/* Correct button — only for others' non-deleted messages */}
            {canCorrect && (
              <button
                onClick={() => setShowSubmitCorrection(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#3b82f615', border: '1px solid #3b82f640' }}
                title={t('corrections.buttonTitle')}
              >
                <PenLine size={11} style={{ color: '#3b82f6' }} />
              </button>
            )}

            {/* Edit button — only for own messages within 15 min */}
            {canEdit && (
              <button onClick={handleStartEdit}
                className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.editMessage')}>
                <Pencil size={11} style={{ color: 'var(--text3)' }} />
              </button>
            )}

            {/* Delete button — own messages or mod/owner */}
            {canDelete && (
              <button onClick={handleDelete}
                className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef444420' }} title={t('actions.deleteMessage')}>
                <Trash2 size={11} style={{ color: '#ef4444' }} />
              </button>
            )}

            {!msg.isDeleted && !isMe && msg.senderId !== undefined && msg.senderId !== null && (
              <>
                <button onClick={() => { const isMuted = moderationMap[String(msg.senderId!)]?.muted; onUpdateModeration(msg.senderId!, { muted: !isMuted }) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.muteToggle')}>
                  <span style={{ fontSize: '11px' }}>{'\u{1F507}'}</span>
                </button>
                <button onClick={() => { const isBlocked = moderationMap[String(msg.senderId!)]?.blocked; onUpdateModeration(msg.senderId!, { blocked: !isBlocked }) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }} title={t('actions.blockToggle')}>
                  <span style={{ fontSize: '11px' }}>{'\u{1F6AB}'}</span>
                </button>

                {sessionUserId && ['mod', 'owner'].includes(getUserRoleInRoom(sessionUserId)) && (
                  <button onClick={() => {
                    const duration = prompt(t('actions.banPrompt'), '60')
                    if (duration !== null && msg.senderId) {
                      onHandleBanUser(msg.senderId, t('actions.banDefaultReason'), parseInt(duration) || 0)
                    }
                  }}
                    className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }} title={t('actions.banUser')}>
                    <span style={{ fontSize: '11px', color: '#fff' }}>{'\u{1F6B7}'}</span>
                  </button>
                )}
              </>
            )}

            {!msg.isDeleted && !isMe && (
              <button onClick={() => { onSetShowReport(msg.id); onSetReportReason('') }}
                className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                <Flag size={11} style={{ color: 'var(--text3)' }} />
              </button>
            )}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker === msg.id && (
          <div className="absolute z-20 flex flex-wrap gap-1 p-2 rounded-xl shadow-xl max-w-[300px]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', bottom: '110%' }}>
            {emojiRecents.map(e => (
              <button key={e} onClick={() => onHandleReact(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Submit Correction Modal ─────────────────────────────────────────── */}
      <SubmitCorrectionModal
        show={showSubmitCorrection}
        originalText={msg.content}
        messageId={msg.id}
        sessionUserId={sessionUserId}
        sessionUserName={sessionUserName}
        roomId={roomId}
        onClose={() => setShowSubmitCorrection(false)}
        onCorrectSubmitted={(correction) => {
          onCorrectionSubmitted(msg.id, correction)
        }}
        onEmitSocket={onEmitPeerCorrect}
      />

      {/* ── View Corrections Modal ──────────────────────────────────────────── */}
      <ViewCorrectionsModal
        show={showViewCorrections}
        originalText={msg.content}
        messageId={msg.id}
        corrections={msg.corrections ?? []}
        sessionUserId={sessionUserId}
        isMessageAuthor={isMe}
        onClose={() => setShowViewCorrections(false)}
        onMarkHelpful={() => { /* local state managed inside modal */ }}
      />
    </>
  )
}
