'use client';

import { motion } from 'framer-motion';
import { Link as LinkIcon, ChevronLeft, ExternalLink, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';

const links = [
    { title: 'Duolingo', url: 'https://duolingo.com', desc: 'Aprende idiomas de forma gratuita', category: 'App', rating: 4.5 },
    { title: 'Anki', url: 'https://apps.ankiweb.net', desc: 'Flashcards con repetición espaciada', category: 'App', rating: 4.8 },
    { title: 'BBC Learning English', url: 'https://bbc.co.uk/learningenglish', desc: 'Recursos de inglés de la BBC', category: 'Web', rating: 4.6 },
    { title: 'Lingolia Español', url: 'https://espanol.lingolia.com', desc: 'Gramática española explicada', category: 'Web', rating: 4.2 },
    { title: 'Italki', url: 'https://italki.com', desc: 'Clases con profesores nativos', category: 'Plataforma', rating: 4.7 },
    { title: 'Conjuguemos', url: 'https://conjuguemos.com', desc: 'Práctica de verbos en español', category: 'Web', rating: 4.1 },
    { title: 'Forvo', url: 'https://forvo.com', desc: 'Pronunciación por hablantes nativos', category: 'Web', rating: 4.4 },
    { title: 'Tandem', url: 'https://tandem.net', desc: 'App de intercambio de idiomas', category: 'App', rating: 4.3 },
];

const catColors: Record<string, string> = { App: '#f59e0b', Web: '#10b981', Plataforma: '#8b5cf6' };

export default function LinksPage() {
    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text2)' }}>
                        <ChevronLeft size={16} /> Recursos
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                            <LinkIcon size={20} style={{ color: '#f59e0b' }} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Links Útiles</h1>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {links.map((l, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <a href={l.url} target="_blank" rel="noopener noreferrer">
                                <div className="p-5 rounded-2xl cursor-pointer transition-all group"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium mr-2"
                                                style={{ background: `${catColors[l.category]}20`, color: catColors[l.category] }}>{l.category}</span>
                                        </div>
                                        <ExternalLink size={14} style={{ color: 'var(--text3)' }} className="group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{l.title}</h3>
                                    <p className="text-sm mb-3" style={{ color: 'var(--text2)' }}>{l.desc}</p>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={11} fill={s <= Math.round(l.rating) ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
                                        ))}
                                        <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>{l.rating}</span>
                                    </div>
                                </div>
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
