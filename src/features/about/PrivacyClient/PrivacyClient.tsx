'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function PrivacyClient() {
    const t = useTranslations('PrivacyPage');

    // Extrayendo el mapping a partir de las llaves en los locales (s0..s6)
    const sections = Array.from({ length: 7 }).map((_, i) => ({
        title: t(`sections.s${i}.title`),
        content: t(`sections.s${i}.content`)
    }));

    return (
        <div className="min-h-screen py-14 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-2xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('updated')}</p>
                </motion.div>

                <div className="space-y-4">
                    {sections.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <h2 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{s.title}</h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>{s.content}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
