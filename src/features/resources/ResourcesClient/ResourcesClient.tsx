'use client';

import { motion } from 'framer-motion';
import { Book, Video, FileText, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function ResourcesClient() {
    const t = useTranslations('Resources');
    const resources = [
        { title: t('textbooks'), icon: Book, description: t('textbooksDesc'), color: '#2d88ff', href: '/resources/textbooks', count: t('textbooksCount') },
        { title: t('videos'), icon: Video, description: t('videosDesc'), color: '#8b5cf6', href: '/resources/videos', count: t('videosCount') },
        { title: t('articles'), icon: FileText, description: t('articlesDesc'), color: '#10b981', href: '/resources/articles', count: t('articlesCount') },
        { title: t('links'), icon: LinkIcon, description: t('linksDesc'), color: '#f59e0b', href: '/resources/links', count: t('linksCount') },
    ];

    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>{t('title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text2)' }}>{t('subtitle')}</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map((r, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <Link href={r.href}>
                                <div className="p-6 rounded-2xl transition-all duration-200 group cursor-pointer"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; (e.currentTarget as HTMLElement).style.borderColor = r.color; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${r.color}20` }}>
                                            <r.icon size={22} style={{ color: r.color }} />
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--text3)' }} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                    <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>{r.title}</h2>
                                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text2)' }}>{r.description}</p>
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${r.color}20`, color: r.color }}>{r.count}</span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}