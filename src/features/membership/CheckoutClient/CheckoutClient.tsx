"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CreditCard, Shield, Zap, Loader2, ChevronLeft, Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CheckoutClient() {
    const searchParams = useSearchParams();
    const t = useTranslations('CheckoutPage');

    const plans = {
        pro: { name: t('plans.pro.name'), price: '$2.99', period: t('plans.pro.period'), color: '#2d88ff', features: [t('plans.pro.features.f0'), t('plans.pro.features.f1'), t('plans.pro.features.f2'), t('plans.pro.features.f3')] },
        premium: { name: t('plans.premium.name'), price: '$9.99', period: t('plans.premium.period'), color: '#8b5cf6', features: [t('plans.premium.features.f0'), t('plans.premium.features.f1'), t('plans.premium.features.f2'), t('plans.premium.features.f3'), t('plans.premium.features.f4')] },
    };

    const planId = (searchParams.get('plan') || 'pro') as keyof typeof plans;
    const plan = plans[planId] || plans.pro;

    const [form, setForm] = useState({ name: '', card: '', expiry: '', cvv: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const formatCard = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
    const formatExpiry = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise(r => setTimeout(r, 2000));
        setLoading(false);
        setDone(true);
    };

    if (done) return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center p-10 rounded-3xl max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <Check size={36} style={{ color: '#10b981' }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('doneTitle')}</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
                    {t('doneMessage', { planColor: '' })} <span style={{ color: plan.color }}>{plan.name}</span>.
                </p>
                <Link href="/">
                    <button className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={{ background: plan.color }}>
                        {t('homeButton')}
                    </button>
                </Link>
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen py-12 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <Link href="/membership" className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--text2)' }}>
                    <ChevronLeft size={15} /> {t('backToPlans')}
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Order summary */}
                    <div>
                        <div className="p-6 rounded-2xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text)' }}>{t('orderSummary')}</h2>
                            <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'var(--surface2)' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}20` }}>
                                    <Zap size={20} style={{ color: plan.color }} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold" style={{ color: 'var(--text)' }}>Daisu {plan.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('subscription')}</p>
                                </div>
                                <span className="font-bold text-lg" style={{ color: plan.color }}>{plan.price}</span>
                            </div>
                            <ul className="space-y-2.5">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text2)' }}>
                                        <Check size={14} style={{ color: plan.color }} /> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
                            <Shield size={13} style={{ color: '#10b981' }} />
                            <span>{t('securityBadge')}</span>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-5">
                            <CreditCard size={18} style={{ color: plan.color }} />
                            <h2 className="font-bold" style={{ color: 'var(--text)' }}>{t('paymentInfo')}</h2>
                            <Lock size={13} className="ml-auto" style={{ color: 'var(--text3)' }} />
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {[
                                { label: t('fields.emailLabel'), key: 'email', type: 'email', placeholder: t('fields.emailPlaceholder') },
                                { label: t('fields.nameLabel'), key: 'name', type: 'text', placeholder: t('fields.namePlaceholder') },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{f.label}</label>
                                    <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder} required
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('fields.cardNumberLabel')}</label>
                                <input value={form.card} onChange={e => setForm(p => ({ ...p, card: formatCard(e.target.value) }))} placeholder="1234 5678 9012 3456" required maxLength={19}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('fields.expiryLabel')}</label>
                                    <input value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: formatExpiry(e.target.value) }))} placeholder="MM/AA" required maxLength={5}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>{t('fields.cvvLabel')}</label>
                                    <input value={form.cvv} onChange={e => setForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))} placeholder="123" required maxLength={3}
                                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2"
                                style={{ background: plan.color }}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                                {loading ? t('processing') : t('subscribeButton', { price: plan.price, period: plan.period })}
                            </button>
                        </form>
                        <p className="text-[11px] text-center mt-3" style={{ color: 'var(--text3)' }}>
                            {t('demoWarning')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
