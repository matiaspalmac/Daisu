'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { showToast as toast } from 'nextjs-toast-notify'
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [token, setToken] = useState<string | null>(null)
    const t = useTranslations('ResetPasswordPage')
    const searchParams = useSearchParams()

    useEffect(() => {
        setToken(searchParams.get('token'))
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error(t('errorMismatch'), { duration: 5000 })
            return
        }
        if (!token) {
            toast.error(t('errorToken'), { duration: 5000 })
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                if (res.status === 400 || res.status === 401) {
                    toast.error(data.message || t('errorToken'), { duration: 5000 })
                } else {
                    toast.error(t('errorGeneric'), { duration: 5000 })
                }
                return
            }
            setDone(true)
        } catch {
            toast.error(t('errorGeneric'), { duration: 5000 })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--primary)' }}>{t('title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>{t('subtitle')}</p>
                </div>

                <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px var(--shadow)' }}>
                    {done ? (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <CheckCircle size={48} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{t('successTitle')}</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>{t('successDesc')}</p>
                            </div>
                            <Link href="/login"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white"
                                style={{ background: 'var(--primary)' }}>
                                {t('goToLogin')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder={t('newPasswordPlaceholder')}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                    />
                                </div>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder={t('confirmPasswordPlaceholder')}
                                        className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2"
                                    style={{ background: 'var(--primary)' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {loading ? t('submitting') : t('submit')}
                                </button>
                            </form>
                            <div className="mt-5 pt-4 text-center text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                                <Link href="/login" className="flex items-center justify-center gap-1" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                    <ArrowLeft size={12} />
                                    {t('backToLogin')}
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
