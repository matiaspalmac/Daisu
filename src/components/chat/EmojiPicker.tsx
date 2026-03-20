'use client'

import React from 'react'

export interface EmojiPickerProps {
  emojiRecents: string[]
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ emojiRecents, onSelect }: EmojiPickerProps) {
  return (
    <div className="absolute z-20 flex flex-wrap gap-1 p-2 rounded-xl shadow-xl max-w-[300px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', bottom: '110%' }}>
      {emojiRecents.map(e => (
        <button key={e} onClick={() => onSelect(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
      ))}
    </div>
  )
}
