/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api'

export interface TranslationResult {
  translated_text: string
  from: string
  to: string
  usage: {
    used: number
    limit: number | null // null = unlimited (premium)
  }
}

export type TranslationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: TranslationResult; visible: boolean }
  | { status: 'limit_reached'; limit: number }
  | { status: 'error'; message: string }

/**
 * Manages inline translation for a single message bubble.
 * Caches the result so the API is only called once per message.
 */
export function useMessageTranslation(targetLang: string | undefined) {
  const [state, setState] = useState<TranslationState>({ status: 'idle' })
  // Per-instance cache (survives re-renders, cleared on unmount)
  const cachedRef = useRef<TranslationResult | null>(null)

  const translate = useCallback(
    async (text: string) => {
      // Already have a cached result — just toggle visibility
      if (cachedRef.current) {
        setState(prev =>
          prev.status === 'done'
            ? { ...prev, visible: !prev.visible }
            : { status: 'done', result: cachedRef.current!, visible: true }
        )
        return
      }

      if (!targetLang) return

      setState({ status: 'loading' })

      try {
        const res = await apiFetch('/api/translate', {
          method: 'POST',
          body: JSON.stringify({ text, to: targetLang }),
        })

        if (res.status === 429) {
          // Rate-limited / daily limit
          let limit = 20
          try {
            const body = await res.json()
            limit = body?.usage?.limit ?? body?.limit ?? 20
          } catch { /* ignore */ }
          setState({ status: 'limit_reached', limit })
          return
        }

        if (!res.ok) {
          setState({ status: 'error', message: 'api_error' })
          return
        }

        const data: TranslationResult = await res.json()
        cachedRef.current = data
        setState({ status: 'done', result: data, visible: true })
      } catch {
        setState({ status: 'error', message: 'network_error' })
      }
    },
    [targetLang]
  )

  const toggleVisible = useCallback(() => {
    setState(prev =>
      prev.status === 'done' ? { ...prev, visible: !prev.visible } : prev
    )
  }, [])

  const reset = useCallback(() => {
    cachedRef.current = null
    setState({ status: 'idle' })
  }, [])

  return { state, translate, toggleVisible, reset }
}
