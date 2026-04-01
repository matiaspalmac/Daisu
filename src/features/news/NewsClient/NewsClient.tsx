'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ChevronRight, Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

type Category = 'all' | 'tips' | 'events' | 'stories' | 'updates' | 'world';

const ITEM_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const ITEM_META: Record<number, { category: Exclude<Category, 'all'>; icon: string; lang?: 'es' | 'en' | 'pt'; featured?: boolean; hasAudio?: boolean; hasAction?: boolean }> = {
  1: { category: 'tips', icon: '💡', lang: 'es', featured: true, hasAudio: true, hasAction: true },
  2: { category: 'events', icon: '🔥', hasAction: true },
  3: { category: 'stories', icon: '⭐', lang: 'es', hasAction: true },
  4: { category: 'updates', icon: '🚀' },
  5: { category: 'events', icon: '🏆', hasAction: true },
  6: { category: 'world', icon: '🌍' },
  7: { category: 'tips', icon: '🎧', lang: 'pt', hasAction: true },
  8: { category: 'world', icon: '📊' },
};

const CATEGORY_COLORS: Record<Exclude<Category, 'all'>, string> = {
  tips: '#f59e0b', events: '#8b5cf6', stories: '#10b981', updates: '#3b82f6', world: '#ef4444',
};
const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' };

export default function NewsClient() {
  const t = useTranslations('News');
  const [activeFilter, setActiveFilter] = useState<Category>('all');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const FILTER_KEYS: { id: Category; key: string }[] = [
    { id: 'all', key: 'filter.all' },
    { id: 'tips', key: 'filter.tips' },
    { id: 'events', key: 'filter.events' },
    { id: 'stories', key: 'filter.stories' },
    { id: 'updates', key: 'filter.updates' },
    { id: 'world', key: 'filter.world' },
  ];

  const items = ITEM_IDS
    .map(id => ({ id, ...ITEM_META[id] }))
    .filter(item => activeFilter === 'all' || item.category === activeFilter);

  const featured = items.find(i => i.featured);
  const grid = items.filter(i => !i.featured);

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div {...fade()} className="mb-8">
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text)' }}>📰 {t('title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('subtitle')}</p>
        </motion.div>

        {/* Filters */}
        <motion.div {...fade(0.04)} className="flex gap-2 flex-wrap mb-8">
          {FILTER_KEYS.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeFilter === f.id ? 'var(--primary)' : 'var(--surface)',
                color: activeFilter === f.id ? '#fff' : 'var(--text2)',
                border: `1px solid ${activeFilter === f.id ? 'var(--primary)' : 'var(--border)'}`,
              }}>
              {t(f.key as any)}
            </button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">

            {/* Featured */}
            <AnimatePresence mode="wait">
              {featured && (
                <motion.div key={featured.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-3xl overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px var(--shadow)' }}>
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${CATEGORY_COLORS[featured.category]}, var(--primary))` }} />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: `${CATEGORY_COLORS[featured.category]}20`, color: CATEGORY_COLORS[featured.category] }}>
                        {t('featured')}
                      </span>
                      {t.has(`items.${featured.id}.badge` as any) && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{t(`items.${featured.id}.badge` as any)}</span>
                      )}
                      {featured.lang && <span className="text-lg">{LANG_FLAGS[featured.lang]}</span>}
                      {featured.hasAudio && <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text3)' }}><Mic size={12} /> {t('audioLabel')}</span>}
                    </div>
                    <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{t(`items.${featured.id}.title` as any)}</h2>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text2)' }}>{t(`items.${featured.id}.content` as any)}</p>
                    {t.has(`items.${featured.id}.example` as any) && (
                      <div className="p-3 rounded-xl mb-4 text-sm italic" style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                        {t(`items.${featured.id}.example` as any)}
                      </div>
                    )}
                    {/* Audio player */}
                    {featured.hasAudio && (
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>▶</button>
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                            <div className="h-full w-1/3 rounded-full" style={{ background: 'var(--primary)' }} />
                          </div>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>1:24</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]" style={{ background: 'var(--primary)' }}>
                          {(t(`items.${featured.id}.author` as any) as string)[0]}
                        </div>
                        <span>{t(`items.${featured.id}.author` as any)}</span>
                        <span>·</span>
                        <span>{t(`items.${featured.id}.date` as any)}</span>
                      </div>
                      {featured.hasAction && (
                        <Link href="/chat">
                          <button className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold hover:scale-105 transition-all"
                            style={{ background: 'var(--primary)', color: '#fff' }}>
                            {t(`items.${featured.id}.action` as any)} <ChevronRight size={13} />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {grid.map((item, i) => {
                  const catColor = CATEGORY_COLORS[item.category];
                  const filterLabel = FILTER_KEYS.find(f => f.id === item.category);
                  return (
                    <motion.div key={item.id} {...fade(i * 0.05)} layout
                      className="p-4 rounded-2xl flex flex-col cursor-pointer transition-all"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px var(--shadow)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${catColor}20`, color: catColor }}>
                          {filterLabel ? t(filterLabel.key as any) : item.category}
                        </span>
                        {item.lang && <span className="text-sm">{LANG_FLAGS[item.lang]}</span>}
                        {t.has(`items.${item.id}.badge` as any) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{t(`items.${item.id}.badge` as any)}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mb-2 leading-snug flex-1" style={{ color: 'var(--text)' }}>{t(`items.${item.id}.title` as any)}</h3>
                      <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'var(--text2)' }}>{t(`items.${item.id}.content` as any)}</p>
                      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[9px]" style={{ background: catColor }}>
                            {(t(`items.${item.id}.author` as any) as string)[0]}
                          </div>
                          <span>{t(`items.${item.id}.author` as any)}</span>
                        </div>
                        {item.hasAction
                          ? <Link href="/chat"><button className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{t(`items.${item.id}.action` as any)}</button></Link>
                          : <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{t(`items.${item.id}.date` as any)}</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {grid.length === 0 && !featured && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('empty')}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Subscribe */}
            <motion.div {...fade(0.1)} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={16} style={{ color: 'var(--primary)' }} />
                <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('subscribe.title')}</h3>
              </div>
              {subscribed
                ? <p className="text-sm font-semibold" style={{ color: '#10b981' }}>✅ {t('subscribe.success')}</p>
                : <form onSubmit={handleSubscribe} className="space-y-2">
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('subscribe.placeholder')} type="email"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <button type="submit" className="w-full py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                    {t('subscribe.button')}
                  </button>
                </form>}
            </motion.div>

            {/* Suggest */}
            <motion.div {...fade(0.14)} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>{t('suggest.title')}</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text3)' }}>{t('suggest.desc')}</p>
              <a href="mailto:info@daisu.com?subject=Sugerencia de noticia"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                <Mail size={13} /> {t('suggest.button')}
              </a>
            </motion.div>

            {/* Quick stats */}
            <motion.div {...fade(0.18)} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>{t('quickStats.title')}</h3>
              <div className="space-y-2.5">
                {[
                  { label: t('quickStats.messages'), value: '12,430', icon: '💬' },
                  { label: t('quickStats.newUsers'), value: '284', icon: '👤' },
                  { label: t('quickStats.rooms'), value: '9', icon: '#️⃣' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text3)' }}>{s.icon} {s.label}</span>
                    <strong style={{ color: 'var(--text)' }}>{s.value}</strong>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}