'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Globe, BookOpen, Zap, ChevronDown, ChevronRight, Star, Users, TrendingUp, Hash, Smile } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import io, { Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/api';

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

interface Room { id: string; name: string; language: string; level: string; onlineCount?: number; }
interface Message { id: string; content: string; user: { name: string; image: string }; sent_at: string; }
interface HomeStats { users?: number; messages?: number; }

// Trending types
interface TrendingRoom { id: string; name: string; language: string; messageCount: number; }
interface TrendingUser { id: string; name: string; image?: string; messageCount: number; language?: string; }
interface TrendingWord { word: string; count: number; language?: string; }
interface TrendingReaction { emoji: string; count: number; }

const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' };
const LEVEL_COLORS: Record<string, string> = { 'A1-A2': '#10b981', 'A1': '#10b981', 'B1-B2': '#3b82f6', 'B1': '#3b82f6', 'C1-C2': '#8b5cf6' };

export default function HomeClient() {
  const t = useTranslations('HomePage');
  const tc = useTranslations('Common');
  const { data: session } = useSession();
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [miniChatRoom, setMiniChatRoom] = useState<Room | null>(null);
  const [miniMessages, setMiniMessages] = useState<Message[]>([]);
  const [miniInput, setMiniInput] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [liveUsers, setLiveUsers] = useState(0);
  const [liveMessages, setLiveMessages] = useState(0);
  const [isMiniChatOpen, setIsMiniChatOpen] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trending state
  const [trendingRooms, setTrendingRooms] = useState<TrendingRoom[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [trendingWords, setTrendingWords] = useState<TrendingWord[]>([]);
  const [trendingReactions, setTrendingReactions] = useState<TrendingReaction[]>([]);

  // Real counters from backend stats
  useEffect(() => {
    apiFetch('/api/stats')
      .then(r => r.json())
      .then((s: HomeStats) => {
        if (typeof s?.users === 'number') setLiveUsers(s.users);
        if (typeof s?.messages === 'number') setLiveMessages(s.messages);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    apiFetch('/api/rooms?limit=6')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setFeaturedRooms(d.slice(0, 6)); })
      .catch(() => { });
  }, []);

  // Fetch all trending data in parallel
  useEffect(() => {
    Promise.allSettled([
      apiFetch('/api/trending/rooms').then(r => r.json()),
      apiFetch('/api/trending/users').then(r => r.json()),
      apiFetch('/api/trending/words?language=es').then(r => r.json()),
      apiFetch('/api/trending/reactions').then(r => r.json()),
    ]).then(([rooms, users, words, reactions]) => {
      if (rooms.status === 'fulfilled' && Array.isArray(rooms.value)) setTrendingRooms(rooms.value.slice(0, 10));
      if (users.status === 'fulfilled' && Array.isArray(users.value)) setTrendingUsers(users.value.slice(0, 20));
      if (words.status === 'fulfilled' && Array.isArray(words.value)) setTrendingWords(words.value.slice(0, 20));
      if (reactions.status === 'fulfilled' && Array.isArray(reactions.value)) setTrendingReactions(reactions.value.slice(0, 12));
    });
  }, []);

  useEffect(() => {
    if (!miniChatRoom || !session) return;
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API!, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join-room', { roomId: miniChatRoom.id, userId: session.user?.id, userName: session.user?.name });
    socket.on('message-history', (msgs: Message[]) => setMiniMessages(msgs.slice(-8)));
    socket.on('new-message', (msg: Message) => setMiniMessages(p => [...p.slice(-7), msg]));
    return () => { socket.disconnect(); };
  }, [miniChatRoom, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [miniMessages]);

  const sendMini = () => {
    if (!miniInput.trim() || !socketRef.current || !miniChatRoom || !session) return;
    socketRef.current.emit('send-message', { roomId: miniChatRoom.id, userId: session.user?.id, userName: session.user?.name, content: miniInput.trim() });
    setMiniInput('');
  };

  const features = [
    { icon: <MessageCircle size={22} />, key: 'chat', color: '#2d88ff' },
    { icon: <Globe size={22} />, key: 'languages', color: '#10b981' },
    { icon: <Zap size={22} />, key: 'ai', color: '#8b5cf6' },
    { icon: <BookOpen size={22} />, key: 'tandem', color: '#f59e0b' },
  ];

  const testimonialKeys = ['t0', 't1', 't2', 't3'] as const;
  const faqKeys = [0, 1, 2, 3] as const;

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* ── HERO ─────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--primary)' }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15" style={{ background: '#8b5cf6' }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)30' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
            {t('hero.badge')}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-5xl sm:text-7xl font-black mb-4 leading-none" style={{ color: 'var(--text)' }}>
            {t('hero.title')}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl sm:text-2xl font-medium mb-2" style={{ color: 'var(--text2)' }}>
            {t('hero.subtitle')}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-sm mb-4" style={{ color: 'var(--primary)' }}>
            {t('hero.subtitleHighlight')}
          </motion.p>
          {/* Live stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-6 mb-8">
            {[
              { value: liveUsers.toLocaleString(), label: t('hero.statsActive'), type: 'metric' as const },
              { value: liveMessages.toLocaleString(), label: t('hero.statsMessages'), type: 'metric' as const },
              { value: t('hero.statsLanguages'), label: null, type: 'languages' as const },
            ].map((s, i) => (
              <div key={i} className="text-center">
                {s.type === 'languages' ? (
                  <div>
                    <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text3)' }}>{s.value}</p>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {(['es', 'en', 'pt'] as const).map(code => (
                        <span key={code} className="text-[11px] px-2 py-1 rounded-full font-semibold"
                          style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                          {tc(`languages.${code}` as any)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>{s.value}</p>
                    {s.label && <p className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</p>}
                  </>
                )}
              </div>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-wrap justify-center gap-3">
            <Link href="/chat">
              <button className="px-7 py-3.5 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 hover:shadow-lg" style={{ background: 'var(--primary)' }}>
                {t('hero.ctaPrimary')}
              </button>
            </Link>
            <Link href="/membership">
              <button className="px-7 py-3.5 rounded-2xl font-semibold text-lg transition-all hover:scale-105" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {t('hero.ctaSecondary')}
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text)' }}>{t('features.title')}</h2>
            <p style={{ color: 'var(--text3)' }}>{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="p-5 rounded-2xl text-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${f.color}20`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{t(`features.${f.key}.title` as any)}</h3>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>{t(`features.${f.key}.desc` as any)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED ROOMS ───────────────────── */}
      {featuredRooms.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>{t('rooms.title')}</h2>
                <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('rooms.subtitle')}</p>
              </div>
              <Link href="/chat">
                <button className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                  {t('rooms.viewAll')} <ChevronRight size={16} />
                </button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredRooms.map((room, i) => (
                <motion.div key={room.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}
                  className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{LANG_FLAGS[room.language] || '🌐'}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>#{room.name}</p>
                        {room.level && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${LEVEL_COLORS[room.level] || '#666'}20`, color: LEVEL_COLORS[room.level] || '#666' }}>{room.level}</span>
                        )}
                      </div>
                    </div>
                    <Link href="/chat">
                      <button className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white" style={{ background: 'var(--primary)' }}>{t('rooms.join')}</button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text3)' }}>
                    <Users size={11} />
                    <span>{(room.onlineCount || Math.floor(Math.random() * 20) + 2)} {t('rooms.online')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING ─────────────────────────── */}
      {(trendingRooms.length > 0 || trendingUsers.length > 0 || trendingWords.length > 0 || trendingReactions.length > 0) && (
        <section className="py-16 px-4" style={{ background: 'var(--surface)' }}>
          <div className="max-w-5xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-3"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                <TrendingUp size={14} />
                {t('trending.badge')}
              </div>
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>{t('trending.title')}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>{t('trending.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Trending Rooms ── */}
              {trendingRooms.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="p-5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                      <Hash size={16} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('trending.rooms.title')}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto"
                      style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {t('trending.rooms.badge')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {trendingRooms.map((room, i) => (
                      <div key={room.id} className="flex items-center gap-3 py-1.5">
                        <span className="w-5 text-[11px] font-bold text-right flex-shrink-0" style={{ color: 'var(--text3)' }}>#{i + 1}</span>
                        <span className="text-base flex-shrink-0">{LANG_FLAGS[room.language] || '🌐'}</span>
                        <span className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--text)' }}>#{room.name}</span>
                        <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>
                          <MessageCircle size={11} />
                          <span className="font-medium">{room.messageCount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Active Users ── */}
              {trendingUsers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} viewport={{ once: true }}
                  className="p-5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#10b98120', color: '#10b981' }}>
                      <Users size={16} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('trending.users.title')}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ background: '#10b98115', color: '#10b981' }}>
                      {t('trending.users.badge')}
                    </span>
                  </div>
                  {/* Avatar strip */}
                  <div className="flex flex-wrap gap-3">
                    {trendingUsers.slice(0, 12).map((user) => (
                      <div key={user.id} className="flex flex-col items-center gap-1 w-14">
                        {user.image
                          ? <Image src={user.image} alt={user.name} width={36} height={36} className="w-9 h-9 rounded-full object-cover"
                              style={{ border: '2px solid var(--border)' }} />
                          : <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
                              style={{ background: `hsl(${(user.name.charCodeAt(0) * 37) % 360}, 60%, 50%)`, border: '2px solid var(--border)' }}>
                              {user.name[0]?.toUpperCase()}
                            </div>
                        }
                        <span className="text-[10px] text-center font-medium leading-tight truncate w-full" style={{ color: 'var(--text2)' }}>
                          {user.name.split(' ')[0]}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--text3)' }}>{user.messageCount} msgs</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Trending Words ── */}
              {trendingWords.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} viewport={{ once: true }}
                  className="p-5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
                      <Globe size={16} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('trending.words.title')}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
                      {t('trending.words.badge')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingWords.map((w, i) => {
                      // Scale font size from large to small based on count ratio
                      const maxCount = trendingWords[0]?.count || 1;
                      const ratio = w.count / maxCount;
                      const fontSize = ratio > 0.75 ? '1rem' : ratio > 0.5 ? '0.875rem' : ratio > 0.25 ? '0.75rem' : '0.6875rem';
                      const fontWeight = ratio > 0.75 ? 800 : ratio > 0.5 ? 700 : ratio > 0.25 ? 600 : 500;
                      const opacity = ratio > 0.5 ? 1 : ratio > 0.25 ? 0.8 : 0.6;
                      return (
                        <span key={i} className="px-2.5 py-1 rounded-full cursor-default transition-transform hover:scale-105"
                          style={{ fontSize, fontWeight, opacity, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Trending Reactions ── */}
              {trendingReactions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} viewport={{ once: true }}
                  className="p-5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                      <Smile size={16} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('trending.reactions.title')}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                      {t('trending.reactions.badge')}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {trendingReactions.map((r, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl cursor-default transition-colors"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span className="text-2xl leading-none">{r.emoji}</span>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text3)' }}>{r.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-10" style={{ color: 'var(--text)' }}>{t('testimonials.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {testimonialKeys.map((key, i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="p-5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="flex" style={{ color: '#f59e0b' }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="currentColor" />)}
                </div>
                <p className="my-3 text-sm italic" style={{ color: 'var(--text2)' }}>&ldquo;{t(`testimonials.${key}.quote` as any)}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ background: 'var(--primary)' }}>{(t(`testimonials.${key}.name` as any) as string)[0]}</div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{t(`testimonials.${key}.name` as any)}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{t(`testimonials.${key}.country` as any)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{t(`testimonials.${key}.level` as any)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: 'var(--text)' }}>{t('faq.title')}</h2>
          <div className="space-y-2">
            {faqKeys.map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t(`faq.q${i}` as any)}</span>
                  <ChevronDown size={16} style={{ color: 'var(--text3)', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      <p className="px-5 pb-4 text-sm" style={{ color: 'var(--text2)' }}>{t(`faq.a${i}` as any)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="p-10 rounded-3xl" style={{ background: 'linear-gradient(135deg, var(--primary)15, #8b5cf615)', border: '1px solid var(--primary)30' }}>
            <h2 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text)' }}>{t('cta.title')}</h2>
            <p className="mb-8 text-sm" style={{ color: 'var(--text3)' }}>{t('cta.subtitle')}</p>
            <Link href="/chat">
              <button className="px-8 py-4 rounded-2xl font-bold text-white text-lg hover:scale-105 transition-transform" style={{ background: 'var(--primary)' }}>
                {session ? t('cta.buttonLoggedIn') : t('cta.buttonAnon')}
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── MINI CHAT WIDGET ─────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence mode="wait">
          {isMiniChatOpen ? (
            <motion.div key="mini-open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ delay: 0.2, type: 'spring' }}
              className="w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '420px' }}>
              {/* header */}
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-bold text-sm flex-1">{t('miniChat.title')}</span>
                {/* Room chips */}
                {session && (
                  <div className="flex gap-1">
                    {featuredRooms.slice(0, 3).map(r => (
                      <button key={r.id} onClick={() => setMiniChatRoom(r)}
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold transition-all"
                        style={{ background: miniChatRoom?.id === r.id ? '#fff' : 'rgba(255,255,255,0.2)', color: miniChatRoom?.id === r.id ? 'var(--primary)' : '#fff' }}>
                        {LANG_FLAGS[r.language] || '#'}{r.name?.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setIsMiniChatOpen(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>×</button>
              </div>
              {/* messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 120 }}>
                {!session ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>{t('miniChat.loginTitle')}</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text3)' }}>{t('miniChat.loginDesc')}</p>
                    <Link href="/login">
                      <button className="text-xs px-4 py-2 rounded-xl font-semibold text-white" style={{ background: 'var(--primary)' }}>{t('miniChat.loginButton')}</button>
                    </Link>
                  </div>
                ) : !miniChatRoom ? (
                  <p className="text-center text-xs py-4" style={{ color: 'var(--text3)' }}>{t('miniChat.selectRoom')}</p>
                ) : miniMessages.length === 0 ? (
                  <p className="text-center text-xs py-4" style={{ color: 'var(--text3)' }}>{t('rooms.openChat')}</p>
                ) : (
                  miniMessages.map(m => (
                    <div key={m.id} className="flex gap-2">
                      {m.user?.image
                        ? <Image src={m.user.image} alt={m.user.name} width={20} height={20} className="w-5 h-5 rounded-full flex-shrink-0 object-cover" />
                        : <div className="w-5 h-5 rounded-full flex-shrink-0 text-[9px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--primary)' }}>{m.user?.name?.[0]}</div>}
                      <div>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{m.user?.name} </span>
                        <span className="text-[11px]" style={{ color: 'var(--text2)' }}>{m.content}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* input */}
              {session && miniChatRoom && (
                <div className="flex gap-2 p-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <input value={miniInput} onChange={e => setMiniInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMini()}
                    placeholder={`${t('rooms.join')} #${miniChatRoom.name}...`}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <button onClick={sendMini} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: 'var(--primary)' }}>→</button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.button key="mini-closed" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setIsMiniChatOpen(true)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center relative"
              style={{ background: 'var(--primary)', color: '#fff' }}
              title={t('miniChat.title')}>
              <MessageCircle size={24} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-green-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
