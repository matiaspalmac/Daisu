'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceData {
  isOnline: boolean
  lastSeenAt: string | null
  currentRoomId?: string | null
}

// ─── Relative time helper ─────────────────────────────────────────────────────

/**
 * Returns a locale-aware relative time string, e.g.
 *   "5m ago"  /  "hace 5 min"  /  "há 5 min"
 */
export function formatRelativeTime(
  isoDate: string | null | undefined,
  locale: string
): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  // Use Intl.RelativeTimeFormat when available
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
    if (diffSec < 60) return rtf.format(-diffSec, 'second')
    if (diffMin < 60) return rtf.format(-diffMin, 'minute')
    if (diffHr < 24) return rtf.format(-diffHr, 'hour')
    return rtf.format(-diffDay, 'day')
  } catch {
    // Fallback: simple English-style
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDay}d ago`
  }
}

// ─── Dot-only indicator ───────────────────────────────────────────────────────

interface OnlineIndicatorProps {
  /** Size of the dot in px (default 10) */
  size?: number
  isOnline: boolean
  /** Extra Tailwind classes for the wrapper span */
  className?: string
}

/**
 * Simple green / gray dot that signals online / offline status.
 * Place this in an absolutely-positioned wrapper over an avatar.
 */
export function OnlineIndicator({ size = 10, isOnline, className = '' }: OnlineIndicatorProps) {
  return (
    <span
      className={`block rounded-full border-2 border-[var(--surface)] flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: isOnline ? '#22c55e' : '#6b7280',
      }}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  )
}

// ─── Hook: fetch presence for a single user ───────────────────────────────────

/**
 * Fetches `/api/users/:id/presence` and refreshes every `intervalMs`.
 * Returns null while loading.
 */
export function usePresence(
  userId: string | number | null | undefined,
  intervalMs = 30_000
): PresenceData | null {
  const [presence, setPresence] = useState<PresenceData | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    try {
      const res = await apiFetch(`/api/users/${userId}/presence`)
      if (res.ok) {
        const data: PresenceData = await res.json()
        setPresence(data)
      }
    } catch {
      // silently ignore
    }
  }, [userId])

  useEffect(() => {
    setPresence(null)
    fetch()
    const id = setInterval(fetch, intervalMs)
    return () => clearInterval(id)
  }, [fetch, intervalMs])

  return presence
}

// ─── Badge: "Online" or "Last seen X ago" ────────────────────────────────────

interface PresenceBadgeProps {
  presence: PresenceData | null
  locale: string
  /** i18n strings — pass from `useTranslations('OnlineIndicator')` */
  labels: {
    online: string
    lastSeen: string   // e.g. "Last seen {time}" — {time} is replaced
  }
  className?: string
}

/**
 * Renders an "Online" green badge or "Last seen 5m ago" gray text.
 */
export function PresenceBadge({ presence, locale, labels, className = '' }: PresenceBadgeProps) {
  if (!presence) return null

  if (presence.isOnline) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${className}`}
        style={{ background: '#22c55e20', color: '#16a34a' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        {labels.online}
      </span>
    )
  }

  const relTime = formatRelativeTime(presence.lastSeenAt, locale)
  if (!relTime) return null

  return (
    <span className={`text-xs text-[var(--text3)] ${className}`}>
      {labels.lastSeen.replace('{time}', relTime)}
    </span>
  )
}
