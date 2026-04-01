"use client";

import { useState } from 'react';
import { Users, Search, Code, Globe, Languages } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const LANGUAGES_KEYS = ['es', 'en', 'pt'] as const;

export default function LanguagesClient() {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useTranslations('LanguagesPage');

    const languages = LANGUAGES_KEYS.map(code => ({
        code,
        name: t(`langs.${code}.name`),
        description: t(`langs.${code}.description`),
        speakers: code === 'es' ? '534M' : code === 'en' ? '1.1B' : '234M', // kept static for presentation, though could be moved
        emoji: code === 'es' ? '🇪🇸' : code === 'en' ? '🇬🇧' : '🇧🇷'
    }));

    const filtered = languages.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
                            <Languages size={28} style={{ color: 'var(--primary)' }} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>{t('subtitle')}</p>
                    <div className="max-w-xs mx-auto relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('searchPlaceholder')}
                            className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm outline-none"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                </motion.div>

                <div className="space-y-4">
                    {filtered.map((lang, i) => (
                        <motion.div key={lang.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <div className="p-6 rounded-2xl transition-all duration-200"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl">{lang.emoji}</span>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>{lang.name}</h3>
                                        <p className="text-sm mb-2" style={{ color: 'var(--text2)' }}>{lang.description}</p>
                                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text3)' }}>
                                            <span className="flex items-center gap-1"><Users size={12} style={{ color: 'var(--primary)' }} />{lang.speakers} {t('speakers')}</span>
                                            <span className="flex items-center gap-1"><Code size={12} />{lang.code.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <Link href={`/languages/${lang.code}`} passHref>
                                        <button className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                                            style={{ background: 'var(--primary)', color: '#fff' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}>
                                            {t('startLearning')}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}