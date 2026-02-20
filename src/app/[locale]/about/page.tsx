'use client';

import { motion } from 'framer-motion';
import { Users, Globe, Target, Heart } from 'lucide-react';

import { useTranslations } from 'next-intl';

const fade = { hidden: { opacity: 0, y: 20 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1 } }) };

export default function AboutPage() {
    const t = useTranslations('AboutPage');

    const values = [
        { icon: Globe, title: t('values.v0.title'), desc: t('values.v0.desc') },
        { icon: Users, title: t('values.v1.title'), desc: t('values.v1.desc') },
        { icon: Target, title: t('values.v2.title'), desc: t('values.v2.desc') },
        { icon: Heart, title: t('values.v3.title'), desc: t('values.v3.desc') },
    ];

    return (
        <div className="min-h-screen py-14 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
                    <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text2)' }}>
                        {t('subtitle')}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {values.map((v, i) => (
                        <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={fade}
                            className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--primary-light)' }}>
                                <v.icon size={20} style={{ color: 'var(--primary)' }} />
                            </div>
                            <h3 className="font-semibold mb-1.5" style={{ color: 'var(--text)' }}>{v.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>{v.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div custom={4} initial="hidden" animate="visible" variants={fade}
                    className="p-8 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{t('missionTitle')}</h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                        {t('missionDesc')}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
