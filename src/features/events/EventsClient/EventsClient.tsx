/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Users, Globe, Star, Plus, X, ChevronRight,
  Loader2, Lock, CheckCircle2, Zap, Filter, Search, User, Trash2, Edit3,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────── */
type EventType = 'session' | 'workshop' | 'challenge' | 'meetup' | 'ama';
type Language  = 'es' | 'en' | 'pt';
type Level     = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface DaisuEvent {
  id: number;
  title: string;
  description: string;
  type: EventType;
  language: Language;
  level: Level;
  starts_at: string;
  ends_at: string;
  max_attendees: number | null;
  attendees_count: number;
  is_premium: number | boolean;
  host_id: number;
  host_name?: string;
  host_image?: string;
  is_registered?: boolean;
  is_hosting?: boolean;
  attendees?: Array<{ id: number; name: string; image: string }>;
}

type Tab = 'upcoming' | 'my' | 'create';

/* ─── Constants ─────────────────────────────────────────── */
const EVENT_TYPES: EventType[] = ['session', 'workshop', 'challenge', 'meetup', 'ama'];
const LANGUAGES: Language[]    = ['es', 'en', 'pt'];
const LEVELS: Level[]          = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const TYPE_COLORS: Record<EventType, string> = {
  session:   '#3b82f6',
  workshop:  '#8b5cf6',
  challenge: '#f59e0b',
  meetup:    '#10b981',
  ama:       '#ef4444',
};

const LANG_FLAGS: Record<Language, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷' };

const LEVEL_COLORS: Record<Level, { bg: string; text: string }> = {
  A1: { bg: '#fca5a520', text: '#ef4444' },
  A2: { bg: '#fb923c20', text: '#f97316' },
  B1: { bg: '#fbbf2420', text: '#f59e0b' },
  B2: { bg: '#34d39920', text: '#10b981' },
  C1: { bg: '#60a5fa20', text: '#3b82f6' },
  C2: { bg: '#a78bfa20', text: '#8b5cf6' },
};

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch { return iso; }
}

function isPremiumEvent(ev: DaisuEvent) {
  return ev.is_premium === 1 || ev.is_premium === true;
}

/* ─── Sub-components ─────────────────────────────────────── */
function EventCard({
  event, onSelect, onRegister, onUnregister, onDelete, isHost, isAdmin,
  userTier, t,
}: {
  event: DaisuEvent;
  onSelect: (e: DaisuEvent) => void;
  onRegister: (id: number) => void;
  onUnregister: (id: number) => void;
  onDelete?: (id: number) => void;
  isHost: boolean;
  isAdmin: boolean;
  userTier: string;
  t: any;
}) {
  const premium = isPremiumEvent(event);
  const locked  = premium && !['pro', 'premium'].includes(userTier);
  const full    = event.max_attendees !== null && event.attendees_count >= event.max_attendees;
  const typeColor = TYPE_COLORS[event.type] || '#3b82f6';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onClick={() => onSelect(event)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px var(--shadow)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* color bar */}
      <div className="h-1" style={{ background: typeColor }} />

      <div className="p-4">
        {/* badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${typeColor}20`, color: typeColor }}
          >
            {t(`types.${event.type}`)}
          </span>
          <span className="text-sm">{LANG_FLAGS[event.language]}</span>
          {event.level && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: LEVEL_COLORS[event.level]?.bg ?? '#eee',
                color: LEVEL_COLORS[event.level]?.text ?? '#666',
              }}
            >
              {event.level}
            </span>
          )}
          {premium && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#f59e0b20', color: '#f59e0b' }}
            >
              <Star size={9} /> {t('premium')}
            </span>
          )}
          {event.is_registered && !event.is_hosting && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#10b98120', color: '#10b981' }}
            >
              <CheckCircle2 size={9} /> {t('registered')}
            </span>
          )}
          {event.is_hosting && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#8b5cf620', color: '#8b5cf6' }}
            >
              <Zap size={9} /> {t('hosting')}
            </span>
          )}
        </div>

        {/* title */}
        <h3 className="font-bold text-sm leading-snug mb-2" style={{ color: 'var(--text)' }}>
          {locked && <Lock size={12} className="inline mr-1 mb-0.5" />}
          {event.title}
        </h3>

        {/* meta */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
            <Calendar size={11} />
            <span>{fmt(event.starts_at)}</span>
          </div>
          {event.host_name && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
              <User size={11} />
              <span>{event.host_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
            <Users size={11} />
            <span>
              {event.attendees_count}
              {event.max_attendees ? ` / ${event.max_attendees}` : ''}
              {full && (
                <span className="ml-1 text-[#ef4444] font-semibold">{t('full')}</span>
              )}
            </span>
          </div>
        </div>

        {/* action row */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            className="text-[11px] font-medium flex items-center gap-1"
            style={{ color: 'var(--primary)' }}
            onClick={e => { e.stopPropagation(); onSelect(event); }}
          >
            {t('viewDetails')} <ChevronRight size={12} />
          </button>

          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {(isHost || isAdmin) && onDelete && (
              <button
                onClick={() => onDelete(event.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#ef4444', background: '#ef444415' }}
                title={t('cancel')}
              >
                <Trash2 size={13} />
              </button>
            )}

            {!isHost && !event.is_registered && !locked && !full && (
              <button
                onClick={() => onRegister(event.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-colors"
                style={{ background: 'var(--primary)' }}
              >
                {t('register')}
              </button>
            )}
            {!isHost && event.is_registered && (
              <button
                onClick={() => onUnregister(event.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
              >
                {t('unregister')}
              </button>
            )}
            {locked && (
              <span
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: '#f59e0b20', color: '#f59e0b' }}
              >
                {t('premiumRequired')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Detail Modal ───────────────────────────────────────── */
function EventDetail({
  event, onClose, onRegister, onUnregister, userTier, userId, isAdmin, t,
}: {
  event: DaisuEvent;
  onClose: () => void;
  onRegister: (id: number) => void;
  onUnregister: (id: number) => void;
  userTier: string;
  userId: number;
  isAdmin: boolean;
  t: any;
}) {
  const premium = isPremiumEvent(event);
  const locked  = premium && !['pro', 'premium'].includes(userTier);
  const full    = event.max_attendees !== null && event.attendees_count >= event.max_attendees;
  const isHost  = event.host_id === userId;
  const typeColor = TYPE_COLORS[event.type] || '#3b82f6';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${typeColor}, var(--primary))` }} />
        <div className="p-6">
          {/* header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-bold"
                style={{ background: `${typeColor}20`, color: typeColor }}
              >
                {t(`types.${event.type}`)}
              </span>
              <span className="text-lg">{LANG_FLAGS[event.language]}</span>
              {event.level && (
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background: LEVEL_COLORS[event.level]?.bg ?? '#eee',
                    color: LEVEL_COLORS[event.level]?.text ?? '#666',
                  }}
                >
                  {event.level}
                </span>
              )}
              {premium && (
                <span
                  className="flex items-center gap-0.5 text-[11px] px-2.5 py-1 rounded-full font-bold"
                  style={{ background: '#f59e0b20', color: '#f59e0b' }}
                >
                  <Star size={11} /> {t('premium')}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
            >
              <X size={16} />
            </button>
          </div>

          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{event.title}</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text2)' }}>{event.description}</p>

          {/* meta grid */}
          <div
            className="grid grid-cols-2 gap-3 p-3 rounded-xl mb-4"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>{t('detail.starts')}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{fmt(event.starts_at)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>{t('detail.ends')}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{fmt(event.ends_at)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>{t('detail.host')}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{event.host_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>{t('detail.attendees')}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {event.attendees_count}{event.max_attendees ? ` / ${event.max_attendees}` : ''}
              </p>
            </div>
          </div>

          {/* attendee list */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>{t('detail.attendeeList')}</p>
              <div className="flex flex-wrap gap-1.5">
                {event.attendees.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px]"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {a.image
                      ? <img src={a.image} alt={a.name} className="w-4 h-4 rounded-full object-cover" />
                      : <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]" style={{ background: 'var(--primary)' }}>{a.name[0]}</div>
                    }
                    {a.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* action */}
          <div className="flex justify-end gap-2">
            {locked && (
              <p className="text-sm text-center w-full" style={{ color: '#f59e0b' }}>
                <Lock size={14} className="inline mr-1" /> {t('premiumOnlyDesc')}
              </p>
            )}
            {!isHost && !locked && !event.is_registered && !full && (
              <button
                onClick={() => { onRegister(event.id); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--primary)' }}
              >
                {t('register')}
              </button>
            )}
            {!isHost && event.is_registered && (
              <button
                onClick={() => { onUnregister(event.id); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
              >
                {t('unregister')}
              </button>
            )}
            {full && !event.is_registered && (
              <span
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#ef444420', color: '#ef4444' }}
              >
                {t('full')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Create Form ────────────────────────────────────────── */
function CreateForm({ onCreated, t }: { onCreated: () => void; t: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: 'session' as EventType,
    language: 'es' as Language, level: 'B1' as Level,
    starts_at: '', ends_at: '', max_attendees: '',
    is_premium: false,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.starts_at || !form.ends_at) {
      setError(t('create.errorRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          language: form.language,
          level: form.level,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
          is_premium: form.is_premium ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (err: any) {
      setError(err.message || t('create.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '0.75rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
  };

  const labelStyle = { color: 'var(--text2)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' } as const;

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 space-y-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{t('create.title')}</h2>

      {error && (
        <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>
      )}

      <div>
        <label style={labelStyle}>{t('create.titleLabel')}</label>
        <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('create.titlePlaceholder')} />
      </div>

      <div>
        <label style={labelStyle}>{t('create.descLabel')}</label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder={t('create.descPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>{t('create.typeLabel')}</label>
          <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
            {EVENT_TYPES.map(tp => (
              <option key={tp} value={tp}>{t(`types.${tp}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('create.langLabel')}</label>
          <select style={inputStyle} value={form.language} onChange={e => set('language', e.target.value)}>
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{LANG_FLAGS[l]} {l.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>{t('create.levelLabel')}</label>
          <select style={inputStyle} value={form.level} onChange={e => set('level', e.target.value)}>
            {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('create.maxAttendeesLabel')}</label>
          <input
            style={inputStyle}
            type="number"
            min="1"
            value={form.max_attendees}
            onChange={e => set('max_attendees', e.target.value)}
            placeholder={t('create.maxAttendeesPlaceholder')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>{t('create.startsLabel')}</label>
          <input style={inputStyle} type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>{t('create.endsLabel')}</label>
          <input style={inputStyle} type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_premium}
          onChange={e => set('is_premium', e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm" style={{ color: 'var(--text2)' }}>{t('create.premiumLabel')}</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
        style={{ background: 'var(--primary)', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? t('create.creating') : t('create.submit')}
      </button>
    </motion.form>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function EventsClient() {
  const t = useTranslations('EventsPage');
  const { data: session } = useSession();

  const user     = session?.user as any;
  const userId   = Number(user?.id ?? 0);
  const userTier = (user?.tier ?? user?.membership ?? 'basic') as string;
  const isAdmin  = Boolean(user?.isAdmin);

  const [tab,       setTab]       = useState<Tab>('upcoming');
  const [events,    setEvents]    = useState<DaisuEvent[]>([]);
  const [myEvents,  setMyEvents]  = useState<DaisuEvent[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState<DaisuEvent | null>(null);
  const [search,    setSearch]    = useState('');
  const [filterLang, setFilterLang] = useState<Language | 'all'>('all');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');

  /* ─── Fetch ─────────────────────────────────────────────── */
  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLang !== 'all') params.set('language', filterLang);
      if (filterType !== 'all') params.set('type', filterType);
      const res  = await apiFetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : (data.events ?? []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterLang, filterType]);

  const fetchMyEvents = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const res  = await apiFetch('/api/events/my');
      const data = await res.json();
      setMyEvents(Array.isArray(data) ? data : (data.events ?? []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [session?.user]);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);
  useEffect(() => { if (tab === 'my') fetchMyEvents(); }, [tab, fetchMyEvents]);

  /* ─── Detail fetch ──────────────────────────────────────── */
  const openDetail = async (ev: DaisuEvent) => {
    setSelected(ev);
    try {
      const res  = await apiFetch(`/api/events/${ev.id}`);
      const data = await res.json();
      setSelected(data ?? ev);
    } catch { /* keep partial */ }
  };

  /* ─── Actions ───────────────────────────────────────────── */
  const handleRegister = async (id: number) => {
    try {
      await apiFetch(`/api/events/${id}/register`, { method: 'POST' });
      fetchUpcoming();
      if (tab === 'my') fetchMyEvents();
    } catch { /* silent */ }
  };

  const handleUnregister = async (id: number) => {
    try {
      await apiFetch(`/api/events/${id}/unregister`, { method: 'POST' });
      fetchUpcoming();
      if (tab === 'my') fetchMyEvents();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      fetchUpcoming();
      if (tab === 'my') fetchMyEvents();
    } catch { /* silent */ }
  };

  /* ─── Filter ─────────────────────────────────────────────── */
  const source  = tab === 'my' ? myEvents : events;
  const visible = source.filter(ev => {
    const matchSearch = !search.trim() || ev.title.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const fade = (i = 0) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.04, duration: 0.3 },
  });

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div {...fade()} className="mb-6">
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text)' }}>
            📅 {t('title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('subtitle')}</p>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fade(0.04)} className="flex gap-2 mb-6 flex-wrap">
          {(['upcoming', 'my', 'create'] as Tab[]).map(tb => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                background: tab === tb ? 'var(--primary)' : 'var(--surface)',
                color: tab === tb ? '#fff' : 'var(--text2)',
                border: `1px solid ${tab === tb ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {t(`tabs.${tb}`)}
            </button>
          ))}
        </motion.div>

        {/* Create tab */}
        {tab === 'create' && session?.user && (
          <CreateForm onCreated={() => { setTab('upcoming'); fetchUpcoming(); }} t={t} />
        )}
        {tab === 'create' && !session?.user && (
          <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
            <Lock size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('loginRequired')}</p>
          </div>
        )}

        {/* Upcoming / My tabs */}
        {tab !== 'create' && (
          <>
            {/* Filters */}
            <motion.div {...fade(0.06)} className="flex gap-2 flex-wrap mb-5">
              {/* Search */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm flex-1 min-w-[180px]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Search size={14} style={{ color: 'var(--text3)' }} />
                <input
                  className="bg-transparent outline-none flex-1 text-sm"
                  style={{ color: 'var(--text)' }}
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Language filter (only on upcoming) */}
              {tab === 'upcoming' && (
                <>
                  {(['all', ...LANGUAGES] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setFilterLang(l)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: filterLang === l ? 'var(--primary)' : 'var(--surface)',
                        color: filterLang === l ? '#fff' : 'var(--text2)',
                        border: `1px solid ${filterLang === l ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      {l === 'all' ? t('filters.allLangs') : `${LANG_FLAGS[l as Language]} ${l.toUpperCase()}`}
                    </button>
                  ))}

                  <div className="w-px" style={{ background: 'var(--border)' }} />

                  {(['all', ...EVENT_TYPES] as const).map(tp => (
                    <button
                      key={tp}
                      onClick={() => setFilterType(tp)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: filterType === tp
                          ? (tp === 'all' ? 'var(--surface2)' : TYPE_COLORS[tp as EventType])
                          : 'var(--surface)',
                        color: filterType === tp ? (tp === 'all' ? 'var(--text)' : '#fff') : 'var(--text2)',
                        border: `1px solid ${filterType === tp ? (tp === 'all' ? 'var(--border)' : TYPE_COLORS[tp as EventType]) : 'var(--border)'}`,
                      }}
                    >
                      {tp === 'all' ? t('filters.allTypes') : t(`types.${tp}`)}
                    </button>
                  ))}
                </>
              )}
            </motion.div>

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
              </div>
            ) : visible.length === 0 ? (
              <motion.div {...fade(0.1)} className="text-center py-20">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm" style={{ color: 'var(--text3)' }}>
                  {tab === 'my' ? t('emptyMy') : t('empty')}
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {visible.map((ev, i) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onSelect={openDetail}
                      onRegister={handleRegister}
                      onUnregister={handleUnregister}
                      onDelete={isAdmin || ev.host_id === userId ? handleDelete : undefined}
                      isHost={ev.host_id === userId}
                      isAdmin={isAdmin}
                      userTier={userTier}
                      t={t}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <EventDetail
            event={selected}
            onClose={() => setSelected(null)}
            onRegister={handleRegister}
            onUnregister={handleUnregister}
            userTier={userTier}
            userId={userId}
            isAdmin={isAdmin}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
