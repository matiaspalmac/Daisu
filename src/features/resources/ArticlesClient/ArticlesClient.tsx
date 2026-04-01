'use client';

import { motion } from 'framer-motion';
import { FileText, ChevronLeft, Clock, User } from 'lucide-react';
import { Link } from '@/i18n/routing';

const articles = [
    { title: 'Cómo aprender un idioma en 6 meses', author: 'María López', date: 'Ene 2025', readTime: '8 min', tag: 'Estrategias' },
    { title: 'The Science of Language Acquisition', author: 'James Smith', date: 'Feb 2025', readTime: '12 min', tag: 'Research' },
    { title: '10 trucos para recordar vocabulario', author: 'Carlos Ruiz', date: 'Mar 2025', readTime: '6 min', tag: 'Vocabulario' },
    { title: 'Por que o intercâmbio linguístico funciona', author: 'Ana Silva', date: 'Mar 2025', readTime: '9 min', tag: 'Intercâmbio' },
    { title: 'Common Mistakes Spanish Speakers Make in English', author: 'Emily Johnson', date: 'Abr 2025', readTime: '7 min', tag: 'English' },
    { title: 'Inmersión total: ventajas y desventajas', author: 'Diego Martín', date: 'Abr 2025', readTime: '10 min', tag: 'Métodos' },
];

export default function ArticlesClient() {
    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-2xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text2)' }}>
                        <ChevronLeft size={16} /> Recursos
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                            <FileText size={20} style={{ color: '#10b981' }} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Artículos</h1>
                    </div>
                </motion.div>

                <div className="space-y-3">
                    {articles.map((a, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="p-5 rounded-2xl cursor-pointer transition-all"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px var(--shadow)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium mb-2 inline-block" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{a.tag}</span>
                                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{a.title}</h3>
                                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text3)' }}>
                                        <span className="flex items-center gap-1"><User size={11} />{a.author}</span>
                                        <span className="flex items-center gap-1"><Clock size={11} />{a.readTime}</span>
                                        <span>{a.date}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
