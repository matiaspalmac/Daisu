'use client';

import { motion } from 'framer-motion';
import { Video, ChevronLeft, Play, Clock } from 'lucide-react';
import { Link } from '@/i18n/routing';

const videos = [
    { title: 'Español desde Cero', duration: '45 min', level: 'A1', lang: '🇪🇸', views: '12.4k' },
    { title: 'English Pronunciation Guide', duration: '32 min', level: 'B1', lang: '🇬🇧', views: '8.1k' },
    { title: 'Verbos en Español', duration: '28 min', level: 'A2', lang: '🇪🇸', views: '5.6k' },
    { title: 'Português para Viagem', duration: '55 min', level: 'A1', lang: '🇧🇷', views: '9.2k' },
    { title: 'Advanced English Grammar', duration: '62 min', level: 'C1', lang: '🇬🇧', views: '3.4k' },
    { title: 'Conversação em Português', duration: '41 min', level: 'B2', lang: '🇧🇷', views: '6.7k' },
    { title: 'Español Coloquial', duration: '38 min', level: 'B2', lang: '🇪🇸', views: '7.8k' },
    { title: 'IELTS Preparation', duration: '90 min', level: 'C1', lang: '🇬🇧', views: '15.1k' },
];

const colors = ['#8b5cf6', '#6366f1', '#7c3aed', '#4f46e5'];

export default function VideosPage() {
    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text2)' }}>
                        <ChevronLeft size={16} /> Recursos
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                            <Video size={20} style={{ color: '#8b5cf6' }} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Videos</h1>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videos.map((v, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="rounded-2xl overflow-hidden cursor-pointer group"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                            {/* Thumbnail */}
                            <div className="h-28 flex items-center justify-center relative overflow-hidden"
                                style={{ background: `linear-gradient(135deg, ${colors[i % colors.length]}40, ${colors[(i + 1) % colors.length]}20)` }}>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform group-hover:scale-110"
                                    style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
                                    <Play size={20} fill="white" style={{ color: 'white' }} />
                                </div>
                                <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>{v.level}</span>
                                <span className="absolute bottom-2 left-2 text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{v.lang}</span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{v.title}</h3>
                                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text3)' }}>
                                    <span className="flex items-center gap-1"><Clock size={11} /> {v.duration}</span>
                                    <span>{v.views} vistas</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
