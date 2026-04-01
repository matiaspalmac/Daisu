'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, MapPin, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ContactClient() {
    const t = useTranslations('ContactPage');
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise(r => setTimeout(r, 1000)); // simulación
        setSent(true);
        setLoading(false);
    };

    const inputStyle: React.CSSProperties = {
        background: 'var(--surface2)', border: '1px solid var(--border)',
        color: 'var(--text)', borderRadius: 12, padding: '10px 14px',
        fontSize: 14, width: '100%', outline: 'none',
    };

    return (
        <div className="min-h-screen py-14 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>{t('subtitle')}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Info */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                        {[
                            { icon: Mail, title: t('email.title'), value: t('email.value') },
                            { icon: MessageSquare, title: t('chat.title'), value: t('chat.value') },
                            { icon: MapPin, title: t('location.title'), value: t('location.value') },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)' }}>
                                    <item.icon size={18} style={{ color: 'var(--primary)' }} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text3)' }}>{item.title}</p>
                                    <p className="text-sm" style={{ color: 'var(--text)' }}>{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Form */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                        className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        {sent ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-4">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
                                    <Send size={22} style={{ color: 'var(--primary)' }} />
                                </div>
                                <h3 className="font-bold" style={{ color: 'var(--text)' }}>{t('success.title')}</h3>
                                <p className="text-sm" style={{ color: 'var(--text2)' }}>{t('success.subtitle')}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('form.nameLabel')}</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('form.namePlaceholder')} required style={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('form.emailLabel')}</label>
                                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t('form.emailPlaceholder')} required style={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('form.messageLabel')}</label>
                                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t('form.messagePlaceholder')} required rows={4}
                                        style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                                    style={{ background: 'var(--primary)' }}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                                    {loading ? t('form.sending') : t('form.submit')}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
