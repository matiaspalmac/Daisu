'use client';

import { motion } from 'framer-motion';
import { Check, Zap, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function MembershipPage() {
    const t = useTranslations('MembershipPage');
    const router = useRouter();
    const fade = { hidden: { opacity: 0, y: 20 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }) };

    const plans = [
        {
            id: 'basic', name: t('basicPlan'), price: t('free_price'), period: '',
            features: [t('basicFeature1'), t('basicFeature2'), t('basicFeature3'), t('basicFeature4'), t('basicFeature5')],
            highlighted: false, cta: t('free_cta'),
        },
        {
            id: 'pro', name: t('proPlan'), price: '$2.99', period: t('period'),
            features: [t('proFeature1'), t('proFeature2'), t('proFeature3'), t('proFeature4')],
            highlighted: true, cta: t('pro_cta'),
        },
        {
            id: 'premium', name: t('premiumPlan'), price: '$9.99', period: t('period'),
            features: [t('premiumFeature1'), t('premiumFeature2'), t('premiumFeature3'), t('premiumFeature4'), t('premiumFeature5')],
            highlighted: false, cta: t('premium_cta'),
        },
    ];

    return (
        <div className="min-h-screen py-14 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-5xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>{t('subtitle')}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                    {plans.map((plan, i) => (
                        <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={fade}
                            className={`rounded-2xl overflow-hidden`}
                            style={{
                                background: 'var(--surface)',
                                border: `1px solid ${plan.highlighted ? 'var(--primary)' : 'var(--border)'}`,
                                transform: plan.highlighted ? 'scale(1.03)' : 'scale(1)',
                                boxShadow: plan.highlighted ? '0 8px 32px rgba(45,136,255,0.2)' : 'none',
                            }}>
                            {plan.highlighted && (
                                <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
                                    <Zap size={12} /> {t('popular')}
                                </div>
                            )}
                            <div className="p-6">
                                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>{plan.name}</h2>
                                <div className="flex items-baseline gap-1 mb-5">
                                    <span className="text-4xl font-bold" style={{ color: plan.highlighted ? 'var(--primary)' : 'var(--text)' }}>{plan.price}</span>
                                    {plan.period && <span className="text-sm" style={{ color: 'var(--text3)' }}>{plan.period}</span>}
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text2)' }}>
                                            <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => {
                                        if (plan.id === 'basic') return;
                                        router.push(`/checkout?plan=${plan.id}`);
                                    }}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                                    style={{
                                        background: plan.highlighted ? 'var(--primary)' : 'var(--surface2)',
                                        color: plan.highlighted ? '#fff' : 'var(--text)',
                                        border: plan.highlighted ? 'none' : '1px solid var(--border)',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = plan.highlighted ? 'var(--primary-hover)' : 'var(--surface3)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = plan.highlighted ? 'var(--primary)' : 'var(--surface2)'; }}>
                                    {plan.cta}
                                    {plan.id !== 'basic' && <ChevronRight size={14} />}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="text-center text-xs mt-8" style={{ color: 'var(--text3)' }}>
                    {t('footer')} <a href="/terms" style={{ color: 'var(--primary)' }}>{t('terms')}</a>.
                </motion.p>
            </div>
        </div>
    );
}