'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Book, Video, FileText, ChevronLeft, ChevronRight, Star, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';

const langData: Record<string, {
    name: string; emoji: string; color: string; greeting: string;
    fact: string; room: string;
    resources: { icon: typeof Book; title: string; desc: string; href: string }[];
    books: { title: string; level: string }[];
    tips: string[];
}> = {
    es: {
        name: 'Español', emoji: '🇪🇸', color: '#c8102e', room: 'Español',
        greeting: '¡Hola! ¡Bienvenido al mundo del español!',
        fact: 'El español es el segundo idioma más hablado en el mundo con más de 534 millones de hablantes nativos.',
        resources: [
            { icon: MessageCircle, title: 'Sala de chat en Español', desc: 'Habla con hablantes nativos en tiempo real', href: '/chat' },
            { icon: Book, title: 'Libros de texto', desc: 'Desde A1 hasta C2', href: '/resources/textbooks' },
            { icon: Video, title: 'Videos de práctica', desc: 'Aprende viendo y escuchando', href: '/resources/videos' },
            { icon: FileText, title: 'Artículos', desc: 'Lee sobre la cultura hispana', href: '/resources/articles' },
        ],
        books: [
            { title: 'Español para Extranjeros', level: 'A1-B2' },
            { title: 'Gramática Avanzada del Español', level: 'C1-C2' },
        ],
        tips: [
            'Practica 20 minutos al día — la constancia es clave',
            'Ve series en español con subtítulos en español',
            'Busca un compañero de intercambio nativo',
            'Aprende las 1000 palabras más comunes primero',
        ],
    },
    en: {
        name: 'English', emoji: '🇬🇧', color: '#012169', room: 'English',
        greeting: 'Hello! Welcome to the English learning journey!',
        fact: 'English is the world\'s most widely spoken language with over 1.1 billion speakers globally.',
        resources: [
            { icon: MessageCircle, title: 'English Chat Room', desc: 'Talk with native speakers in real time', href: '/chat' },
            { icon: Book, title: 'Textbooks', desc: 'From A1 to C2 levels', href: '/resources/textbooks' },
            { icon: Video, title: 'Practice Videos', desc: 'Learn by watching and listening', href: '/resources/videos' },
            { icon: FileText, title: 'Articles', desc: 'Read about English culture', href: '/resources/articles' },
        ],
        books: [
            { title: 'English Grammar in Use', level: 'B1-C1' },
            { title: 'Oxford Practice Grammar', level: 'A2-B2' },
        ],
        tips: [
            'Practice listening with podcasts daily',
            'Watch movies in English with English subtitles',
            'Focus on pronunciation from the beginning',
            'Join the English chat room and speak without fear',
        ],
    },
    pt: {
        name: 'Português', emoji: '🇧🇷', color: '#009c3b', room: 'Português',
        greeting: 'Olá! Bem-vindo ao mundo do português!',
        fact: 'O português é falado por mais de 234 milhões de pessoas em 9 países diferentes.',
        resources: [
            { icon: MessageCircle, title: 'Sala de chat em Português', desc: 'Fale com falantes nativos em tempo real', href: '/chat' },
            { icon: Book, title: 'Livros didáticos', desc: 'Do A1 ao C2', href: '/resources/textbooks' },
            { icon: Video, title: 'Vídeos de prática', desc: 'Aprenda vendo e ouvindo', href: '/resources/videos' },
            { icon: FileText, title: 'Artigos', desc: 'Leia sobre a cultura lusófona', href: '/resources/articles' },
        ],
        books: [
            { title: 'Português Essencial', level: 'A1-A2' },
            { title: 'Falar Português Hoje', level: 'B1-B2' },
        ],
        tips: [
            'Ouça músicas brasileiras ou portuguesas todo dia',
            'Assista séries em português no NetFlix',
            'Pratique com falantes nativos no chat',
            'Aprenda o alfabeto fonético primeiro',
        ],
    },
};

export default function LanguageIntroPage() {
    const params = useParams();
    const id = (params?.id as string)?.toLowerCase() || 'es';
    const lang = langData[id] || langData['es'];

    const fade = (delay: number) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.4 },
    });

    return (
        <div className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
            <div className="max-w-3xl mx-auto">

                {/* Back */}
                <Link href="/languages" className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--text2)' }}>
                    <ChevronLeft size={15} /> Idiomas
                </Link>

                {/* Hero */}
                <motion.div {...fade(0)} className="rounded-3xl p-8 mb-6 text-center overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #1a1f35 0%, #0f1117 100%)', borderLeft: `4px solid ${lang.color}` }}>
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${lang.color} 0%, transparent 60%)` }} />
                    <div className="relative">
                        <span className="text-6xl mb-4 block">{lang.emoji}</span>
                        <h1 className="text-3xl font-bold mb-2" style={{ color: '#e4e6eb' }}>{lang.greeting}</h1>
                        <p className="text-sm max-w-lg mx-auto" style={{ color: '#b0b3b8' }}>{lang.fact}</p>
                    </div>
                </motion.div>

                {/* Quick actions */}
                <motion.div {...fade(0.1)} className="grid grid-cols-2 gap-3 mb-6">
                    <Link href="/chat">
                        <div className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all"
                            style={{ background: 'var(--primary)', color: '#fff' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.9'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                            <MessageCircle size={20} />
                            <div>
                                <p className="font-semibold text-sm">Ir al Chat</p>
                                <p className="text-xs opacity-80">Sala de {lang.name}</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto" />
                        </div>
                    </Link>
                    <Link href="/resources">
                        <div className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                            <Book size={20} style={{ color: 'var(--primary)' }} />
                            <div>
                                <p className="font-semibold text-sm">Ver recursos</p>
                                <p className="text-xs" style={{ color: 'var(--text3)' }}>Libros, videos y más</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text3)' }} />
                        </div>
                    </Link>
                </motion.div>

                {/* Podemos empezar por... */}
                <motion.div {...fade(0.15)} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                        <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Podemos empezar por...</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lang.resources.map((r, i) => (
                            <Link key={i} href={r.href}>
                                <div className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px var(--shadow)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)' }}>
                                        <r.icon size={18} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text3)' }}>{r.desc}</p>
                                    </div>
                                    <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text3)' }} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Libros sugeridos */}
                <motion.div {...fade(0.2)} className="mb-6">
                    <h2 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <Book size={18} style={{ color: 'var(--primary)' }} /> Libros sugeridos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lang.books.map((b, i) => (
                            <Link key={i} href="/resources/textbooks">
                                <div className="p-4 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{b.title}</p>
                                        <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{b.level}</span>
                                    </div>
                                    <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Tips */}
                <motion.div {...fade(0.25)} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <Star size={16} style={{ color: '#f59e0b' }} /> Consejos para aprender {lang.name}
                    </h2>
                    <ul className="space-y-2.5">
                        {lang.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text2)' }}>
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{i + 1}</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
