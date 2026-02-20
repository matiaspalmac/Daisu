/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, MessageCircle, Hash, Trash2, Shield, ShieldOff, Search,
  BarChart3, X, Loader2, Flag, AlertTriangle, CheckCircle2, Edit3
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { showToast as toast } from 'nextjs-toast-notify';
import { useTranslations } from 'next-intl';

interface User {
  id: number; name: string; email: string; image: string;
  isAdmin: boolean | number; bio: string; nativelang: string;
  learninglang: string; targetLang: string; level: string;
  country: string; interests: string; created_at: string; banned_at: string | null;
}
interface Room { id: string; name: string; language: string; level: string; type: string; description: string; daily_prompt: string; message_count: number; created_at: string; }
interface Report { id: number; reason: string; status: string; created_at: string; notes: string; message_content: string; message_id: number; room_id: number; reporter_name: string; reporter_id: number; author_name: string; author_id: number; }
interface Stats { users: number; rooms: number; messages: number; }

const url = process.env.NEXT_PUBLIC_API_URL;
const LEVEL_COLORS: Record<string, string> = { 'A1-A2': '#10b981', 'A1': '#10b981', 'B1-B2': '#3b82f6', 'B1': '#3b82f6', 'C1-C2': '#8b5cf6', 'C1': '#8b5cf6' };
const LANG_FLAGS: Record<string, string> = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷', '': '' };

type Tab = 'overview' | 'users' | 'rooms' | 'messages' | 'reports' | 'moderation';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations('Dashboard');
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, rooms: 0, messages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>({
    topUsers: [],
    messagesPerRoom: [],
    activeUsersTimeline: {},
    languageStats: [],
    floodDetection: [],
    auditLog: [],
  });

  const handleUserImageFile = (file?: File) => {
    if (!file || !editUser) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidImage'));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('toast.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setEditUser(p => (p ? { ...p, image: result } : p));
    };
    reader.onerror = () => toast.error(t('toast.imageReadError'));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/login');
    if (status === 'authenticated' && !session?.user?.isAdmin) redirect('/');
  }, [status, session]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, sRes, repRes] = await Promise.all([
        fetch(`${url}/api/getusers`),
        fetch(`${url}/api/rooms`),
        fetch(`${url}/api/stats`),
        fetch(`${url}/api/reports`),
      ]);
      const [u, r, s, rep] = await Promise.all([uRes.json(), rRes.json(), sRes.json(), repRes.json()]);
      if (Array.isArray(u)) setUsers(u);
      if (Array.isArray(r)) setRooms(r);
      if (s?.users !== undefined) setStats(s);
      if (Array.isArray(rep)) setReports(rep);
    } catch { toast.error(t('toast.error')) } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { if (status === 'authenticated' && session?.user?.isAdmin) fetchAll(); }, [status, session, fetchAll]);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`${url}/api/chats?limit=50`);
    const d = await res.json();
    if (Array.isArray(d)) setMessages(d);
  }, []);

  useEffect(() => { if (tab === 'messages') fetchMessages(); }, [tab, fetchMessages]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [topRes, roomRes, timelineRes, langRes, floodRes, auditRes] = await Promise.all([
        fetch(`${url}/api/analytics/top-users`),
        fetch(`${url}/api/analytics/messages-per-room`),
        fetch(`${url}/api/analytics/active-users-timeline`),
        fetch(`${url}/api/analytics/languages`),
        fetch(`${url}/api/analytics/flood-detection`),
        fetch(`${url}/api/analytics/audit-log?limit=50`),
      ]);
      const [top, room, timeline, lang, flood, audit] = await Promise.all([
        topRes.json(), roomRes.json(), timelineRes.json(), langRes.json(), floodRes.json(), auditRes.json()
      ]);
      setAnalyticsData({
        topUsers: Array.isArray(top) ? top : [],
        messagesPerRoom: Array.isArray(room) ? room : [],
        activeUsersTimeline: timeline,
        languageStats: Array.isArray(lang) ? lang : [],
        floodDetection: flood?.flagged_users || [],
        auditLog: Array.isArray(audit) ? audit : [],
      });
    } catch (e) {
      toast.error(t('toast.analyzticError'));
    }
  }, [t]);

  useEffect(() => {
    if (tab === 'overview') fetchAnalytics();
  }, [tab, fetchAnalytics]);

  const deleteUser = async (id: number) => {
    if (!confirm(t('users.deleteConfirm'))) return;
    await fetch(`${url}/api/deleteuser/${id}`, { method: 'DELETE' });
    setUsers(p => p.filter(u => u.id !== id));
    toast.success(t('toast.deleted'));
  };

  const toggleAdmin = async (user: User) => {
    const newVal = !user.isAdmin;
    await fetch(`${url}/api/users/${user.id}/admin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAdmin: newVal }) });
    setUsers(p => p.map(u => u.id === user.id ? { ...u, isAdmin: newVal } : u));
  };

  const banUser = async (user: User) => {
    const isBanned = !!user.banned_at;
    await fetch(`${url}/api/users/${user.id}/ban`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ban: !isBanned }) });
    setUsers(p => p.map(u => u.id === user.id ? { ...u, banned_at: isBanned ? null : new Date().toISOString() } : u));
    toast.success(isBanned ? t('toast.unbanned') : t('toast.banned'));
  };

  const deleteRoom = async (id: string) => {
    if (!confirm(t('rooms.deleteConfirm'))) return;
    await fetch(`${url}/api/rooms/${id}`, { method: 'DELETE' });
    setRooms(p => p.filter(r => r.id !== id));
    toast.success(t('toast.roomDeleted'));
  };

  const saveEditUser = async () => {
    if (!editUser) return;
    try {
      const res = await fetch(`${url}/api/updateuser`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || t('toast.error'));
        return;
      }
      const persistedUser = data?.user || editUser;
      setUsers(p => p.map(u => u.id === persistedUser.id ? { ...u, ...persistedUser } : u));
      setEditUser(null);
      toast.success(t('toast.updated'));
    } catch {
      toast.error(t('toast.error'));
    }
  };

  const saveEditRoom = async () => {
    if (!editRoom) return;
    await fetch(`${url}/api/rooms/${editRoom.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editRoom) });
    setRooms(p => p.map(r => r.id === editRoom.id ? editRoom : r));
    setEditRoom(null);
    toast.success(t('toast.roomUpdated'));
  };

  const resolveReport = async (id: number, status: string) => {
    await fetch(`${url}/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setReports(p => p.map(r => r.id === id ? { ...r, status } : r));
  };

  const reviewFloodUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (confirm(t('moderation.confirmBanSpam', { name: user.name }))) {
      await banUser(user);
      setAnalyticsData((p: any) => ({
        ...p,
        floodDetection: p.floodDetection.filter((f: any) => f.id !== userId)
      }));
      toast.success(t('moderation.bannedSuccess', { name: user.name }));
    }
  };

  const addBannedWord = async () => {
    const input = document.getElementById('bannedWordInput') as HTMLInputElement;
    if (!input || !input.value.trim()) {
      toast.error(t('moderation.enterWord'));
      return;
    }
    if (!session?.user?.id) {
      toast.error(t('toast.error'));
      return;
    }
    const word = input.value.trim();
    try {
      const res = await fetch(`${url}/api/analytics/banned-words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, requestingUserId: session.user.id })
      });
      if (!res.ok) throw new Error();
      input.value = '';
      toast.success(t('moderation.wordAdded', { word }));
    } catch {
      toast.error(t('moderation.addWordError'));
    }
  };

  if (status === 'loading') return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
      <Loader2 className="animate-spin" size={28} style={{ color: 'var(--primary)' }} />
    </div>
  );
  if (!session?.user?.isAdmin) return null;

  const TABS: { id: Tab; labelKey: string; icon: any; count?: number; warn?: boolean }[] = [
    { id: 'overview', labelKey: 'tabs.overview', icon: BarChart3 },
    { id: 'users', labelKey: 'tabs.users', icon: Users, count: users.length },
    { id: 'rooms', labelKey: 'tabs.rooms', icon: Hash, count: rooms.length },
    { id: 'messages', labelKey: 'tabs.messages', icon: MessageCircle },
    { id: 'reports', labelKey: 'tabs.reports', icon: Flag, count: reports.filter(r => r.status === 'pending').length, warn: reports.some(r => r.status === 'pending') },
    { id: 'moderation', labelKey: 'tabs.moderation', icon: Shield, count: analyticsData.floodDetection.length, warn: analyticsData.floodDetection.length > 0 },
  ];

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roomTypes = [
    { key: 'public', label: t('editRoom.types.public') },
    { key: 'private', label: t('editRoom.types.private') },
    { key: 'daily', label: t('editRoom.types.daily') },
  ];

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🛡 {t('title')}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{t('subtitle')}</p>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <Loader2 size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative"
              style={{ background: tab === tb.id ? 'var(--primary)' : 'var(--surface)', color: tab === tb.id ? '#fff' : 'var(--text2)', border: `1px solid ${tab === tb.id ? 'var(--primary)' : 'var(--border)'}` }}>
              <tb.icon size={14} />
              {t(tb.labelKey as any)}
              {tb.count !== undefined && tb.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: tb.warn ? '#ef4444' : tab === tb.id ? 'rgba(255,255,255,0.2)' : 'var(--surface2)', color: tb.warn ? '#fff' : 'inherit' }}>
                  {tb.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { labelKey: 'overview.users', value: stats.users, icon: Users, color: '#2d88ff' },
                { labelKey: 'overview.rooms', value: stats.rooms, icon: Hash, color: '#10b981' },
                { labelKey: 'overview.messages', value: stats.messages, icon: MessageCircle, color: '#8b5cf6' },
                { labelKey: 'overview.reports', value: reports.filter(r => r.status === 'pending').length, icon: Flag, color: '#ef4444' },
              ].map((s, i) => (
                <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text3)' }}>{t(s.labelKey as any)}</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{Number(s.value).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Flood Detection Warning */}
            {analyticsData.floodDetection.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl" style={{ background: '#ef444420', border: '1px solid #ef4444' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                  <span className="font-bold" style={{ color: '#ef4444' }}>⚠️ {t('moderation.floodTitle')}</span>
                </div>
                <p className="text-sm" style={{ color: '#ef4444' }}>
                  {t('moderation.floodSuspicious', { count: analyticsData.floodDetection.length })}
                </p>
                <div className="mt-2 space-y-1">
                  {analyticsData.floodDetection.slice(0, 5).map((f: any, idx: number) => (
                    <div key={idx} className="text-xs" style={{ color: '#ef4444' }}>
                      • {f.name} {t('moderation.floodRoomStat', { room: f.room_name, count: f.recent_messages })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>👥 {t('overview.topUsersTitle')}</h3>
                <div className="space-y-2">
                  {analyticsData.topUsers.slice(0, 10).map((u: any, idx: number) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--primary)', color: '#fff' }}>{idx + 1}</span>
                      <span style={{ color: 'var(--text)' }}>{u.name}</span>
                      <span className="ml-auto font-semibold" style={{ color: 'var(--primary)' }}>{t('overview.msgsShort', { count: u.message_count })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Users Timeline */}
              <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>📈 {t('overview.activeUsersTitle')}</h3>
                <div className="space-y-2">
                  {[
                    { label: t('overview.period24h'), key: '24h' },
                    { label: t('overview.period7d'), key: '7d' },
                    { label: t('overview.period30d'), key: '30d' },
                  ].map(period => (
                    <div key={period.key} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text2)' }}>{period.label}</span>
                      <span className="font-bold" style={{ color: 'var(--primary)' }}>
                        {t('overview.usersCount', { count: analyticsData.activeUsersTimeline[period.key] || 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages per Room */}
            <div className="p-5 rounded-2xl mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>📊 {t('overview.messagesPerRoomTitle')}</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {analyticsData.messagesPerRoom.slice(0, 15).map((r: any) => {
                  const maxMsg = Math.max(...analyticsData.messagesPerRoom.map((rm: any) => rm.message_count), 1);
                  const pct = (r.message_count / maxMsg) * 100;
                  return (
                    <div key={r.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text2)' }}>{r.name}</span>
                        <span style={{ color: 'var(--primary)' }}>{t('overview.msgsShort', { count: r.message_count })}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Language Distribution */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>🌐 {t('overview.languageDistributionTitle')}</h3>
              {analyticsData.languageStats.length > 0 ? analyticsData.languageStats.map((lang: any) => {
                const maxMsg = Math.max(...analyticsData.languageStats.map((l: any) => l.message_count), 1);
                const pct = (lang.message_count / maxMsg) * 100;
                return (
                  <div key={lang.language} className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text2)' }}>
                      <span>{LANG_FLAGS[lang.language] || '🌐'} {lang.language || t('overview.noLang')}</span>
                      <span>{t('overview.messagesPct', { count: lang.message_count, pct: Math.round(pct) })}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                );
              }) : <p style={{ color: 'var(--text3)' }} className="text-xs">{t('overview.noData')}</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('users.search')}
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            </div>
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--surface)', border: `1px solid ${u.banned_at ? '#ef444440' : 'var(--border)'}` }}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {u.image
                      ? <Image src={u.image} alt={u.name} width={36} height={36} className="object-cover" />
                      : <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white" style={{ background: 'var(--primary)' }}>{u.name?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{u.name}</p>
                      {!!u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(45,136,255,0.15)', color: '#2d88ff' }}>{t('users.admin')}</span>}
                      {u.banned_at && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{t('users.banned')}</span>}
                      {u.level && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${LEVEL_COLORS[u.level] || '#666'}20`, color: LEVEL_COLORS[u.level] || '#666' }}>{u.level}</span>}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>{u.email}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => setEditUser(u)} title={t('users.edit')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}><Edit3 size={13} style={{ color: 'var(--text2)' }} /></button>
                    <button onClick={() => toggleAdmin(u)} title={t('users.toggleAdmin')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                      {u.isAdmin ? <ShieldOff size={13} style={{ color: '#f59e0b' }} /> : <Shield size={13} style={{ color: '#2d88ff' }} />}
                    </button>
                    <button onClick={() => banUser(u)} title={u.banned_at ? t('users.unban') : t('users.ban')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                      <AlertTriangle size={13} style={{ color: u.banned_at ? '#10b981' : '#ef4444' }} />
                    </button>
                    <button onClick={() => deleteUser(u.id)} title={t('users.delete')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}><Trash2 size={13} style={{ color: '#ef4444' }} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROOMS */}
        {tab === 'rooms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(r => (
              <div key={r.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{LANG_FLAGS[r.language] || '🌐'}</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.name}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditRoom(r)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}><Edit3 size={12} style={{ color: 'var(--text2)' }} /></button>
                    <button onClick={() => deleteRoom(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}><Trash2 size={12} style={{ color: '#ef4444' }} /></button>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap text-[10px] mb-2">
                  {r.level && <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: `${LEVEL_COLORS[r.level] || '#666'}20`, color: LEVEL_COLORS[r.level] || '#666' }}>{r.level}</span>}
                  {r.type && <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>{roomTypes.find(rt => rt.key === r.type)?.label || r.type}</span>}
                  <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>{t('rooms.msgs', { count: r.message_count })}</span>
                </div>
                {r.description && <p className="text-xs" style={{ color: 'var(--text3)' }}>{r.description}</p>}
                {r.daily_prompt && <p className="text-xs mt-1 italic" style={{ color: 'var(--primary)' }}>✨ {r.daily_prompt}</p>}
              </div>
            ))}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div className="space-y-2">
            {messages.map(m => (
              <div key={m.id} className="p-3 rounded-xl flex gap-3 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="font-semibold text-xs flex-shrink-0" style={{ color: 'var(--primary)' }}>{m.user?.name}</span>
                <span className="flex-1 break-words" style={{ color: 'var(--text)' }}>{m.content}</span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>#{m.room?.name}</span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>
                  {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--text3)' }}>
                <CheckCircle2 size={40} className="mx-auto mb-2" />
                {t('reports.empty')}
              </div>
            )}
            {reports.map(r => (
              <div key={r.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: `1px solid ${r.status === 'pending' ? '#ef444430' : 'var(--border)'}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: r.status === 'pending' ? '#ef444420' : '#10b98120', color: r.status === 'pending' ? '#ef4444' : '#10b981' }}>{r.status}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{r.reason}</span>
                    </div>
                    <p className="text-xs mb-1.5 p-2 rounded-lg break-words" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{r.message_content}</p>
                    <div className="text-[11px] flex gap-3" style={{ color: 'var(--text3)' }}>
                      <span>{t('reports.by')} <strong style={{ color: 'var(--text2)' }}>{r.reporter_name}</strong></span>
                      <span>{t('reports.author')} <strong style={{ color: 'var(--text)' }}>{r.author_name}</strong></span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => resolveReport(r.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#10b98120', color: '#10b981' }}>{t('reports.resolve')}</button>
                      <button onClick={() => resolveReport(r.id, 'dismissed')} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>{t('reports.dismiss')}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODERATION */}
        {tab === 'moderation' && (
          <div className="space-y-6">
            {/* Flood Detection */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>🚨 {t('moderation.floodTitle')}</h3>
                {analyticsData.floodDetection.length > 0 && (
                  <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                    {t('moderation.suspiciousCount', { count: analyticsData.floodDetection.length })}
                  </span>
                )}
              </div>
              {analyticsData.floodDetection.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text3)' }}>✅ {t('moderation.noSpam')}</p>
              ) : (
                <div className="space-y-2">
                  {analyticsData.floodDetection.map((f: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid #ef444430' }}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{f.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text3)' }}>
                            #{f.room_name} • {t('moderation.messagesIn5Min', { count: f.recent_messages })}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => reviewFloodUser(f.id)} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                            {t('moderation.review')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Log */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>📋 {t('moderation.auditLogTitle')}</h3>
              {analyticsData.auditLog.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('moderation.noAudit')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--text3)' }}>{t('moderation.table.moderator')}</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--text3)' }}>{t('moderation.table.action')}</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--text3)' }}>{t('moderation.table.user')}</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--text3)' }}>{t('moderation.table.room')}</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--text3)' }}>{t('moderation.table.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.auditLog.map((log: any, idx: number) => {
                        const actionColors: Record<string, string> = {
                          'ban': '#ef4444',
                          'unban': '#10b981',
                          'pin': '#8b5cf6',
                          'mention': '#3b82f6',
                          'warn': '#f59e0b',
                        };
                        const actionColor = actionColors[log.action] || 'var(--text3)';
                        return (
                          <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                            <td className="px-3 py-2" style={{ color: 'var(--text)' }}>{log.mod_name}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${actionColor}20`, color: actionColor }}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-3 py-2" style={{ color: 'var(--text2)' }}>{log.target_name}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--text3)' }}>{log.room_name || '-'}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--text3)' }}>
                              {new Date(log.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Banned Words Manager */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>⛔ {t('moderation.bannedWordsTitle')}</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  id="bannedWordInput"
                  placeholder={t('moderation.bannedWordPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onKeyPress={e => e.key === 'Enter' && addBannedWord()}
                />
                <button onClick={addBannedWord} className="px-4 py-2 rounded-xl font-semibold text-white text-sm" style={{ background: 'var(--primary)' }}>
                  {t('moderation.addWordButton')}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('moderation.bannedWordsHelp')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditUser(null)}>
          <div className="rounded-2xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>{t('editUser.title')}</h3>
              <button onClick={() => setEditUser(null)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t('editUser.image')}</label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
                    {editUser.image
                      ? <Image src={editUser.image} alt={editUser.name} width={48} height={48} className="object-cover w-full h-full" />
                      : <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: 'var(--primary)' }}>{editUser.name?.[0]}</div>}
                  </div>
                  <label className="text-xs px-3 py-2 rounded-xl cursor-pointer" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                    {t('editUser.imageUpload')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUserImageFile(e.target.files?.[0])}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editUser.image || ''}
                  onChange={e => setEditUser(p => ({ ...p!, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              {([
                { labelKey: 'editUser.name', key: 'name', type: 'text' },
                { labelKey: 'editUser.email', key: 'email', type: 'email' },
                { labelKey: 'editUser.bio', key: 'bio', type: 'text' },
                { labelKey: 'editUser.country', key: 'country', type: 'text' },
                { labelKey: 'editUser.nativeLang', key: 'nativelang', type: 'text' },
                { labelKey: 'editUser.targetLang', key: 'targetLang', type: 'text' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t(f.labelKey as any)}</label>
                  <input type={f.type} value={(editUser as any)[f.key] || ''} onChange={e => setEditUser(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t('editUser.level')}</label>
                <select value={editUser.level || 'A1'} onChange={e => setEditUser(p => ({ ...p!, level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveEditUser} className="w-full mt-4 py-2.5 rounded-xl font-semibold text-white text-sm" style={{ background: 'var(--primary)' }}>{t('editUser.save')}</button>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditRoom(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>{t('editRoom.title')}</h3>
              <button onClick={() => setEditRoom(null)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {([
                { labelKey: 'editRoom.name', key: 'name' },
                { labelKey: 'editRoom.description', key: 'description' },
                { labelKey: 'editRoom.prompt', key: 'daily_prompt' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t(f.labelKey as any)}</label>
                  <input value={(editRoom as any)[f.key] || ''} onChange={e => setEditRoom(p => ({ ...p!, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t('editRoom.language')}</label>
                <select value={editRoom.language || ''} onChange={e => setEditRoom(p => ({ ...p!, language: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="">{t('editRoom.noLanguage')}</option>
                  <option value="es">{t('editRoom.languages.es')}</option>
                  <option value="en">{t('editRoom.languages.en')}</option>
                  <option value="pt">{t('editRoom.languages.pt')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t('editRoom.level')}</label>
                <select value={editRoom.level || ''} onChange={e => setEditRoom(p => ({ ...p!, level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="">{t('editRoom.noLevel')}</option>
                  {['A1-A2', 'B1-B2', 'C1-C2'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text2)' }}>{t('editRoom.type')}</label>
                <select value={editRoom.type || 'public'} onChange={e => setEditRoom(p => ({ ...p!, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {roomTypes.map(rt => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveEditRoom} className="w-full mt-4 py-2.5 rounded-xl font-semibold text-white text-sm" style={{ background: 'var(--primary)' }}>{t('editRoom.save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}