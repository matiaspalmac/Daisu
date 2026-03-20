'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

export interface Resource {
  id: number
  title: string
  description: string
  url: string
  type: 'textbook' | 'video' | 'article' | 'link'
  language: string
  level: string
  thumbnail_url?: string
  author?: string
  is_featured: boolean
  is_premium: boolean
  view_count: number
}

interface ResourcesResponse {
  resources: Resource[]
  total: number
  limit: number
  offset: number
}

interface UseResourcesOptions {
  type: string
  language?: string
  level?: string
  search?: string
  limit?: number
}

interface UseResourcesReturn {
  resources: Resource[]
  total: number
  loading: boolean
  error: string | null
  savedIds: Set<number>
  toggleSave: (id: number) => Promise<void>
  refetch: () => void
}

export function useResources(options: UseResourcesOptions): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  const { type, language = '', level = '', search = '', limit = 50 } = options

  const fetchResources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        type,
        limit: String(limit),
        offset: '0',
      })
      if (language) params.set('language', language)
      if (level) params.set('level', level)
      if (search) params.set('search', search)

      const res = await apiFetch(`/api/resources?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch resources')
      const data: ResourcesResponse = await res.json()
      setResources(data.resources ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('error')
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [type, language, level, search, limit])

  const fetchSaved = useCallback(async () => {
    try {
      const res = await apiFetch('/api/resources/saved')
      if (!res.ok) return
      const data: ResourcesResponse = await res.json()
      setSavedIds(new Set((data.resources ?? []).map((r: Resource) => r.id)))
    } catch {
      // not authenticated – ignore
    }
  }, [])

  useEffect(() => {
    fetchResources()
    fetchSaved()
  }, [fetchResources, fetchSaved])

  const toggleSave = useCallback(async (id: number) => {
    const isSaved = savedIds.has(id)
    try {
      const res = await apiFetch(`/api/resources/${id}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      })
      if (!res.ok) return
      setSavedIds(prev => {
        const next = new Set(prev)
        if (isSaved) next.delete(id)
        else next.add(id)
        return next
      })
    } catch {
      // ignore
    }
  }, [savedIds])

  return {
    resources,
    total,
    loading,
    error,
    savedIds,
    toggleSave,
    refetch: fetchResources,
  }
}
