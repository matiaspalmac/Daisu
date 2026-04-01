'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing';
import { showToast as toast } from 'nextjs-toast-notify'
import { Mail, Lock, User, Loader2 } from 'lucide-react'

export default function RegisterClient() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/createuser`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })
            if (!res.ok) {
                toast.error(res.status === 409 ? "El usuario ya existe" : "Error al crear la cuenta", { duration: 5000 })
                return
            }
            toast.success("Cuenta creada exitosamente", { duration: 3000 })
            router.push('/login')
        } catch { toast.error("Ocurrió un error. Intenta nuevamente.", { duration: 5000 }) }
        finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--primary)' }}>Daisu</h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>Crea tu cuenta y empieza a aprender</p>
                </div>

                <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px var(--shadow)' }}>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Nombre completo"
                                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                        </div>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Correo electrónico"
                                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Contraseña"
                                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors"
                            style={{ background: 'var(--primary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {loading ? 'Creando...' : 'Crear Cuenta'}
                        </button>
                    </form>
                    <div className="mt-5 pt-4 text-center text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Inicia Sesión</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
