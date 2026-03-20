import { getSession } from 'next-auth/react'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  token?: string
}

/**
 * Authenticated fetch wrapper.
 * Adds Authorization: Bearer <token> automatically from session.
 * Redirects to /login on 401.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  let token = options.token
  if (!token) {
    const session = await getSession()
    token = (session?.user as any)?.accessToken || ''
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  const res = await fetch(url, { ...options, headers })

  // No auto-redirect on 401 — let each page handle it

  return res
}

export { API_URL }
