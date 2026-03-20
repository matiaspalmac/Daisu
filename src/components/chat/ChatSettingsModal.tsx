/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  BubbleTheme,
  FontSize,
  BUBBLE_THEME_COLORS,
  CUSTOM_BUBBLE_PRESETS,
} from './types'

export interface ChatSettingsModalProps {
  show: boolean
  onClose: () => void
  bubbleTheme: BubbleTheme
  onSetBubbleTheme: (theme: BubbleTheme) => void
  myBubbleDraft: string
  otherBubbleDraft: string
  onSetMyBubbleDraft: (v: string) => void
  onSetOtherBubbleDraft: (v: string) => void
  onApplyCustomBubbleColors: () => void
  fontSize: FontSize
  onSetFontSize: (size: FontSize) => void
  roomBgDraft: string
  onSetRoomBgDraft: (v: string) => void
  onApplyRoomBackground: () => void
  onClearRoomBackground: () => void
  effectsEnabled: boolean
  onSetEffectsEnabled: (v: boolean) => void
  textOnlyMode: boolean
  onSetTextOnlyMode: (v: boolean) => void
  dataSaverMode: boolean
  onSetDataSaverMode: (v: boolean) => void
  disableProfileImages: boolean
  onSetDisableProfileImages: (v: boolean) => void
  onResetChatSettingsToDefault: () => void
}

export default function ChatSettingsModal({
  show,
  onClose,
  bubbleTheme,
  onSetBubbleTheme,
  myBubbleDraft,
  otherBubbleDraft,
  onSetMyBubbleDraft,
  onSetOtherBubbleDraft,
  onApplyCustomBubbleColors,
  fontSize,
  onSetFontSize,
  roomBgDraft,
  onSetRoomBgDraft,
  onApplyRoomBackground,
  onClearRoomBackground,
  effectsEnabled,
  onSetEffectsEnabled,
  textOnlyMode,
  onSetTextOnlyMode,
  dataSaverMode,
  onSetDataSaverMode,
  disableProfileImages,
  onSetDisableProfileImages,
  onResetChatSettingsToDefault,
}: ChatSettingsModalProps) {
  const t = useTranslations('ChatPage')

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96 }}
            className="p-5 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>{'\u2699\uFE0F'} {t('settings.title')}</h3>
              <button onClick={onClose} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.bubbleTheme')}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['neon', 'pastel', 'minimal', 'custom'] as BubbleTheme[]).map(theme => (
                    <button key={theme} onClick={() => onSetBubbleTheme(theme)} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between"
                      style={{ background: bubbleTheme === theme ? 'var(--primary)' : 'var(--surface2)', color: bubbleTheme === theme ? '#fff' : 'var(--text2)', border: `1px solid ${bubbleTheme === theme ? 'var(--primary)' : 'var(--border)'}` }}>
                      <span>{t(`settings.themes.${theme}` as any)}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full" style={{ background: theme === 'custom' ? myBubbleDraft : BUBBLE_THEME_COLORS[theme as Exclude<BubbleTheme, 'custom'>].mine }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: theme === 'custom' ? otherBubbleDraft : BUBBLE_THEME_COLORS[theme as Exclude<BubbleTheme, 'custom'>].other, border: '1px solid var(--border)' }} />
                      </span>
                    </button>
                  ))}
                </div>
                {bubbleTheme === 'custom' && (
                  <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{t('settings.myMessages')}</span>
                      <input type="color" value={myBubbleDraft} onChange={e => onSetMyBubbleDraft(e.target.value)} className="w-8 h-8 p-0 border-0 rounded-md cursor-pointer" />
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>{myBubbleDraft.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{t('settings.otherMessages')}</span>
                      <input type="color" value={otherBubbleDraft} onChange={e => onSetOtherBubbleDraft(e.target.value)} className="w-8 h-8 p-0 border-0 rounded-md cursor-pointer" />
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>{otherBubbleDraft.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CUSTOM_BUBBLE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => { onSetMyBubbleDraft(preset.mine); onSetOtherBubbleDraft(preset.other) }}
                          className="px-2 py-2 rounded-lg text-[10px] font-semibold"
                          style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                        >
                          <span className="flex items-center justify-center gap-1 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: preset.mine }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: preset.other, border: '1px solid var(--border)' }} />
                          </span>
                          {preset.id}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'var(--surface)' }}>
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Preview</div>
                      <div className="flex flex-col gap-1">
                        <div className="self-end px-2.5 py-1.5 rounded-xl text-xs text-white" style={{ background: myBubbleDraft }}>Hola {'\u{1F44B}'}</div>
                        <div className="self-start px-2.5 py-1.5 rounded-xl text-xs" style={{ background: otherBubbleDraft, color: 'var(--text)' }}>Hi! How are you?</div>
                      </div>
                    </div>
                    <button onClick={onApplyCustomBubbleColors} className="w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}>
                      {t('settings.saveBackground')}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.fontSize')}</p>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                    <button key={size} onClick={() => onSetFontSize(size)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: fontSize === size ? 'var(--primary)' : 'var(--surface2)', color: fontSize === size ? '#fff' : 'var(--text2)' }}>
                      {t(`settings.sizes.${size}` as any)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{t('settings.roomBackground')}</p>
                <div className="flex gap-2 items-center">
                  <input type="color" value={roomBgDraft || '#000000'} onChange={e => onSetRoomBgDraft(e.target.value)}
                    className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer flex-shrink-0"
                    style={{ background: 'var(--surface2)' }} title={t('settings.backgroundPlaceholder')} />
                  <button onClick={onApplyRoomBackground} className="px-3 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--primary)' }}>{t('settings.saveBackground')}</button>
                  <button onClick={onClearRoomBackground} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{t('settings.removeBackground')}</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: t('settings.effectsEnabled'), value: effectsEnabled, setValue: onSetEffectsEnabled },
                  { label: t('settings.textOnlyMode'), value: textOnlyMode, setValue: onSetTextOnlyMode },
                  { label: t('settings.dataSaverMode'), value: dataSaverMode, setValue: onSetDataSaverMode },
                  { label: t('settings.disableProfileImages'), value: disableProfileImages, setValue: onSetDisableProfileImages },
                ].map(item => (
                  <label key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)' }}>
                    <input type="checkbox" checked={item.value} onChange={e => item.setValue(e.target.checked)} />
                    <span className="text-xs" style={{ color: 'var(--text2)' }}>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                {t('settings.shortcutsHint')}
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={onResetChatSettingsToDefault}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                >
                  {t('settings.resetDefaults')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
