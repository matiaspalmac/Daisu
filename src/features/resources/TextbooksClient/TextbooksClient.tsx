'use client';

import { motion } from 'framer-motion';
import { Book, ChevronLeft, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';

const textbooks = [
    { title: 'Español para Extranjeros', level: 'A1-B2', description: 'Libro completo con ejercicios y gramática', lang: '🇪🇸 Español', free: true },
    { title: 'English Grammar in Use', level: 'B1-C1', description: 'The classic Cambridge grammar reference', lang: '🇬🇧 English', free: false },
    { title: 'Português Essencial', level: 'A1-A2', description: 'Introdução ao português brasileiro', lang: '🇧🇷 Português', free: true },
    { title: 'Gramática Avanzada del Español', level: 'C1-C2', description: 'Para hablantes avanzados con ejercicios', lang: '🇪🇸 Español', free: false },
    { title: 'Oxford Practice Grammar', level: 'A2-B2', description: 'Grammar practice for English learners', lang: '🇬🇧 English', free: false },
    { title: 'Falar Português Hoje', level: 'B1-B2', description: 'Português europeo para nível intermédio', lang: '🇧🇷 Português', free: true },
];

export default function TextbooksClient() {
    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
                        style={{ color: 'var(--text2)' }}>
                        <ChevronLeft size={16} /> Recursos
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(45,136,255,0.15)' }}>
                            <Book size={20} style={{ color: '#2d88ff' }} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Libros de Texto</h1>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {textbooks.map((book, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{book.title}</h3>
                                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{book.lang}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: book.free ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', color: book.free ? '#10b981' : 'var(--text3)' }}>
                                    {book.free ? 'Gratis' : 'Premium'}
                                </span>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>{book.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(45,136,255,0.1)', color: '#2d88ff' }}>{book.level}</span>
                                <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}>
                                    <ExternalLink size={12} /> Ver libro
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
