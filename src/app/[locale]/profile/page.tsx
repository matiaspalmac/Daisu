/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { showToast as toast } from 'nextjs-toast-notify'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User, Mail, FileText, Globe, BookOpen, Camera, Edit2, Check, X, Plus, Tag, Users, Lock, Bell, Palette, Eye, Heart, MessageCircle, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

const url_env = process.env.NEXT_PUBLIC_API_URL

const LEVEL_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: '#fca5a520', text: '#ef4444' }, A2: { bg: '#fb923c20', text: '#f97316' },
  B1: { bg: '#fbbf2420', text: '#f59e0b' }, B2: { bg: '#34d39920', text: '#10b981' },
  C1: { bg: '#60a5fa20', text: '#3b82f6' }, C2: { bg: '#a78bfa20', text: '#8b5cf6' },
}
const LANG_OPTS = ['es', 'en', 'pt'] as const
const BUBBLE_COLORS = ['#2d88ff', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#14b8a6'] as const

interface UserProfile {
  id: number; name: string; email: string; image: string; cover_image: string;
  isAdmin: boolean; bio: string; nativelang: string; learninglang: string;
  targetLang: string; level: string; country: string;
  interests: string[]; tandem_goal: string; created_at: string;
  bubble_color?: string; is_public?: boolean; hide_old_messages?: boolean;
}
interface Stats { messages_sent: number; corrections_given: number; streak: number; unique_words_this_week: number; longest_sentence_words: number; messages_this_week: number; last_active: string; favorite_rooms?: Array<{name: string; message_count: number}>; languages_stats?: Array<{language: string; percentage: number}>; }
interface Follower { id: number; name: string; image: string; }

type Tab = 'overview' | 'connections' | 'privacy' | 'customization'

export default function ProfilePage() {
  const t = useTranslations('ProfilePage')
  const { data: session, update } = useSession()
  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<UserProfile>({
    id: 0, name: '', email: '', image: '', cover_image: '', isAdmin: false,
    bio: '', nativelang: '', learninglang: '', targetLang: '', level: 'A1',
    country: '', interests: [], tandem_goal: '', created_at: '',
    bubble_color: '#2d88ff', is_public: true, hide_old_messages: false,
  })
  const [stats, setStats] = useState<Stats | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [followers, setFollowers] = useState<Follower[]>([])
  const [blockedUsers, setBlockedUsers] = useState<Follower[]>([])
  const [profileViews, setProfileViews] = useState<Array<{id: number; name: string; viewed_at: string}>>([])
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Suggestions from locale keys
  const INTEREST_SUGGESTIONS = Array.from({ length: 14 }, (_, i) => t(`interests.s${i}` as any))

  useEffect(() => {
    if (!session?.user) return
    const s = session.user as any
    let interests: string[] = []
    try { interests = Array.isArray(s.interests) ? s.interests : JSON.parse(s.interests || '[]') } catch { interests = [] }
    setProfile({
      id: s.id, name: s.name || '', email: s.email || '', image: s.image || '',
      cover_image: s.cover_image || '', isAdmin: Boolean(s.isAdmin),
      bio: s.bio || '', nativelang: s.nativelang || '', learninglang: s.learninglang || '',
      targetLang: s.targetLang || '', level: s.level || 'A1',
      country: s.country || '', interests, tandem_goal: s.tandem_goal || '',
      created_at: s.created_at || '', bubble_color: s.bubble_color || '#2d88ff',
      is_public: s.is_public !== false, hide_old_messages: s.hide_old_messages || false,
    })
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`${url_env}/api/users/${session.user.id}`)
      .then(r => r.json())
      .then(u => {
        if (!u || u.error) return
        let interests: string[] = []
        try { interests = Array.isArray(u.interests) ? u.interests : JSON.parse(u.interests || '[]') } catch { interests = [] }
        setProfile(p => ({
          ...p,
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          image: u.image || '',
          cover_image: u.cover_image || '',
          isAdmin: Boolean(u.isAdmin),
          bio: u.bio || '',
          nativelang: u.nativelang || '',
          learninglang: u.learninglang || '',
          targetLang: u.targetLang || '',
          level: u.level || 'A1',
          country: u.country || '',
          interests,
          tandem_goal: u.tandem_goal || '',
          created_at: u.created_at || p.created_at,
          bubble_color: u.bubble_color || '#2d88ff',
          is_public: u.is_public !== false,
          hide_old_messages: u.hide_old_messages || false,
        }))
      })
      .catch(() => { })
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`${url_env}/api/user/stats/${session.user.id}`)
      .then(r => r.json()).then(d => { if (!d.error) setStats(d) }).catch(() => { })
  }, [session])

  // Fetch social data
  useEffect(() => {
    if (!session?.user?.id) return
    Promise.all([
      fetch(`${url_env}/api/users/${session.user.id}/followers`).then(r => r.json()).catch(() => ({})),
      fetch(`${url_env}/api/users/${session.user.id}/blocked`).then(r => r.json()).catch(() => ({})),
      fetch(`${url_env}/api/users/${session.user.id}/profile-views`).then(r => r.json()).catch(() => ({})),
    ]).then(([followers, blocked, views]) => {
      if (Array.isArray(followers)) setFollowers(followers)
      if (Array.isArray(blocked)) setBlockedUsers(blocked)
      if (Array.isArray(views)) setProfileViews(views)
    })
  }, [session?.user?.id])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'cover_image') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida')
      e.target.value = ''
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máx. 3MB)')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      if (!result) return
      setProfile(p => ({ ...p, [field]: result }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    try {
      const res = await fetch(`${url_env}/api/updateuser`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, isAdmin: profile.isAdmin ? 1 : 0 }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || t('toast.error'))
        return
      }

      const saved = data?.user || profile
      let interests: string[] = []
      try { interests = Array.isArray(saved.interests) ? saved.interests : JSON.parse(saved.interests || '[]') } catch { interests = [] }
      const normalizedProfile = {
        ...profile,
        ...saved,
        isAdmin: Boolean(saved.isAdmin),
        interests,
      }
      setProfile(normalizedProfile)
      await update({
        ...session,
        user: {
          ...session?.user,
          id: normalizedProfile.id,
          name: normalizedProfile.name,
          email: normalizedProfile.email,
          image: normalizedProfile.image,
          isAdmin: normalizedProfile.isAdmin,
          nativelang: normalizedProfile.nativelang,
          learninglang: normalizedProfile.learninglang,
          created_at: normalizedProfile.created_at,
          bubble_color: normalizedProfile.bubble_color,
          is_public: normalizedProfile.is_public,
        },
      })
      setIsEditing(false)
      toast.success(t('toast.saved'))
    } catch { toast.error(t('toast.error')) }
  }

  const togglePrivacy = async () => {
    const newValue = !profile.is_public
    const updated = { ...profile, is_public: newValue }
    setProfile(updated)
    await fetch(`${url_env}/api/updateuser`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updated, isAdmin: updated.isAdmin ? 1 : 0 }),
    }).then(() => toast.success(newValue ? t('social.public') : t('social.private')))
      .catch(() => { setProfile(p => ({ ...p, is_public: !newValue })); toast.error(t('toast.error')) })
  }

  const toggleHideOldMessages = async () => {
    const newValue = !profile.hide_old_messages
    const updated = { ...profile, hide_old_messages: newValue }
    setProfile(updated)
    await fetch(`${url_env}/api/updateuser`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updated, isAdmin: updated.isAdmin ? 1 : 0 }),
    }).then(() => toast.success(newValue ? 'Mensajes antiguos ocultados' : 'Mensajes antiguos visibles'))
      .catch(() => { setProfile(p => ({ ...p, hide_old_messages: !newValue })); toast.error(t('toast.error')) })
  }

  const unblockUser = async (userId: number) => {
    await fetch(`${url_env}/api/users/${session?.user?.id}/unblock`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedUserId: userId })
    })
      .then(() => {
        setBlockedUsers(p => p.filter(u => u.id !== userId))
        toast.success('Usuario desbloqueado')
      })
      .catch(() => toast.error(t('toast.error')))
  }

  const addInterest = (tag: string) => {
    if (!tag.trim() || profile.interests.includes(tag.trim())) return
    setProfile(p => ({ ...p, interests: [...p.interests, tag.trim()] }))
    setNewInterest('')
  }
  const removeInterest = (tag: string) => setProfile(p => ({ ...p, interests: p.interests.filter(i => i !== tag) }))

  const levelColor = LEVEL_COLORS[profile.level] || { bg: 'var(--surface2)', text: 'var(--text2)' }
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : ''

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: '👤 Overview', icon: MessageCircle },
    { id: 'connections', label: '👥 Conexiones', icon: Users },
    { id: 'privacy', label: '🔐 Privacidad', icon: Lock },
    { id: 'customization', label: '✨ Personalización', icon: Palette },
  ]

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>
      {/* Cover photo */}
      <div className="relative h-36 sm:h-48 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f35, #0f1117)' }}>
        {profile.cover_image && <Image src={profile.cover_image} alt="cover" fill className="object-cover" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--primary)30, #8b5cf630)' }} />
        {isEditing && (
          <>
            <button onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              <Camera size={13} /> {t('coverChange')}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'cover_image')} />
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Avatar + name row */}
        <div className="relative -mt-14 mb-6">
          <div className="relative inline-block">
            <div className="relative w-24 h-24 rounded-full overflow-hidden" style={{ outline: '4px solid var(--bg)' }}>
              {profile.image
                ? <Image src={profile.image} alt={profile.name} fill className="object-cover rounded-full" />
                : <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'var(--primary)' }}>{profile.name[0]}</div>}
            </div>
            {isEditing && (
              <button onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary)', border: '2px solid var(--bg)' }}>
                <Camera size={13} className="text-white" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'image')} />
          </div>

          <div className="absolute top-14 left-28 sm:left-32 flex items-center gap-2 flex-wrap">
            {profile.isAdmin && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(45,136,255,0.15)', color: '#2d88ff' }}>{t('adminBadge')}</span>}
            {profile.level && <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: levelColor.bg, color: levelColor.text }}>{profile.level}</span>}
            {!profile.is_public && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#ef444220', color: '#ef4444' }}>Privado</span>}
          </div>

          <div className="absolute top-0 right-0 flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
                  <Check size={14} /> {t('saveButton')}
                </button>
                <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <Edit2 size={14} /> {t('editButton')}
              </button>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div className="mb-6">
          {isEditing
            ? <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="text-2xl font-bold outline-none border-b-2 mb-1 w-full" style={{ color: 'var(--text)', borderColor: 'var(--primary)', background: 'transparent' }} />
            : <h1 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text)' }}>{profile.name}</h1>}
          <div className="flex flex-wrap gap-3 text-xs mt-1" style={{ color: 'var(--text3)' }}>
            {memberSince && <span>{t('since', { date: memberSince })}</span>}
            {stats?.last_active && <span>{t('lastActive', { hours: Math.round((Date.now() - new Date(stats.last_active).getTime()) / 3600000) })}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
                color: tab === t.id ? '#fff' : 'var(--text2)',
                border: `1px solid ${tab === t.id ? 'var(--primary)' : 'var(--border)'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Stats cards */}
            {stats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: '💬', value: stats.messages_sent || 0, label: 'Total Mensajes' },
                  { icon: '✅', value: stats.streak || 0, label: 'Racha (días)' },
                  { icon: '🏆', value: stats.corrections_given || 0, label: 'Correcciones' },
                  { icon: '📊', value: stats.unique_words_this_week || 0, label: 'Palabras únicas' },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xl mb-0.5">{s.icon}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.label}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Favorite Rooms */}
            {stats?.favorite_rooms && stats.favorite_rooms.length > 0 && (
              <FieldCard icon={<span>🏠</span>} label="Salas Favoritas">
                <div className="space-y-2">
                  {stats.favorite_rooms.slice(0, 5).map((room, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--text2)' }}>{room.name}</span>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--primary)20', color: 'var(--primary)' }}>{room.message_count} msgs</span>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Languages Stats */}
            {stats?.languages_stats && stats.languages_stats.length > 0 && (
              <FieldCard icon={<Globe size={15} />} label="Idiomas Practicados">
                <div className="space-y-2">
                  {stats.languages_stats.map((lang, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text2)' }}>
                        <span>{lang.language}</span>
                        <span>{Math.round(lang.percentage)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${lang.percentage}%`, background: 'var(--primary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Bio */}
            <FieldCard icon={<FileText size={15} />} label={t('sections.bio')}>
              {isEditing
                ? <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder={t('bio.placeholder')} className="w-full resize-none outline-none text-sm p-2 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                : <p className="text-sm" style={{ color: profile.bio ? 'var(--text2)' : 'var(--text3)' }}>{profile.bio || t('bio.empty')}</p>}
            </FieldCard>

            {/* Interests */}
            <FieldCard icon={<Tag size={15} />} label={t('sections.interests')}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.interests.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    #{tag}
                    {isEditing && <button onClick={() => removeInterest(tag)} className="ml-0.5 opacity-60 hover:opacity-100"><X size={10} /></button>}
                  </span>
                ))}
                {profile.interests.length === 0 && !isEditing && <p className="text-sm" style={{ color: 'var(--text3)' }}>{t('interests.noInterests')}</p>}
              </div>
              {isEditing && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input value={newInterest} onChange={e => setNewInterest(e.target.value)} placeholder={t('interests.add')}
                      onKeyDown={e => e.key === 'Enter' && addInterest(newInterest)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <button onClick={() => addInterest(newInterest)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {INTEREST_SUGGESTIONS.filter(s => !profile.interests.includes(s)).slice(0, 8).map(s => (
                      <button key={s} onClick={() => addInterest(s)} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)' }}>+{s}</button>
                    ))}
                  </div>
                </>
              )}
            </FieldCard>
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {tab === 'connections' && (
          <div className="space-y-4">
            {/* Followers */}
            <FieldCard icon={<Heart size={15} />} label={`👥 Seguidores (${followers.length})`}>
              {followers.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text3)' }}>Aún no tienes seguidores</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {followers.map(f => (
                    <div key={f.id} className="p-2 rounded-lg text-center" style={{ background: 'var(--surface2)' }}>
                      <div className="w-12 h-12 rounded-full mx-auto mb-1 overflow-hidden">
                        {f.image ? <Image src={f.image} alt={f.name} width={48} height={48} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold">{f.name[0]}</div>}
                      </div>
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{f.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </FieldCard>

            {/* Blocked Users */}
            {blockedUsers.length > 0 && (
              <FieldCard icon={<AlertTriangle size={15} />} label={`⛔ Usuarios Bloqueados (${blockedUsers.length})`}>
                <div className="space-y-2">
                  {blockedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--surface2)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          {u.image ? <Image src={u.image} alt={u.name} width={32} height={32} className="object-cover w-full h-full" />
                            : <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-bold">{u.name[0]}</div>}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{u.name}</span>
                      </div>
                      <button onClick={() => unblockUser(u.id)} className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: '#10b98120', color: '#10b981' }}>
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Profile Views */}
            {profileViews.length > 0 && (
              <FieldCard icon={<Eye size={15} />} label={`👁️ Quién vio tu perfil (${profileViews.length})`}>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {profileViews.map(view => (
                    <div key={view.id} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: 'var(--surface2)' }}>
                      <span style={{ color: 'var(--text2)' }}>{view.name}</span>
                      <span style={{ color: 'var(--text3)' }}>
                        {new Date(view.viewed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}
          </div>
        )}

        {/* PRIVACY TAB */}
        {tab === 'privacy' && (
          <div className="space-y-4">
            <FieldCard icon={<Lock size={15} />} label="🔐 Privacidad del Perfil">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Perfil {profile.is_public ? 'Público' : 'Privado'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {profile.is_public ? 'Otros usuarios pueden ver tu perfil' : 'Solo tú puedes ver tu perfil'}
                    </p>
                  </div>
                  <button onClick={togglePrivacy}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                    style={{ background: profile.is_public ? '#ef4444' : '#10b981' }}>
                    {profile.is_public ? 'Hacer Privado' : 'Hacer Público'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Ocultar Mensajes Antiguos</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {profile.hide_old_messages ? 'Los mensajes previos a hace 90 días están ocultos' : 'Todos tus mensajes son visibles'}
                    </p>
                  </div>
                  <button onClick={toggleHideOldMessages}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                    style={{ background: profile.hide_old_messages ? '#10b981' : '#3b82f6' }}>
                    {profile.hide_old_messages ? 'Mostrar Todo' : 'Ocultar'}
                  </button>
                </div>
              </div>
            </FieldCard>

            <FieldCard icon={<Bell size={15} />} label="🔔 Notificaciones">
              <p className="text-sm" style={{ color: 'var(--text3)' }}>Las opciones de notificación se encuentran en tu cuenta de sistema</p>
            </FieldCard>
          </div>
        )}

        {/* CUSTOMIZATION TAB */}
        {tab === 'customization' && (
          <div className="space-y-4">
            {/* Bubble Color */}
            <FieldCard icon={<Palette size={15} />} label="🎨 Color de Burbuja">
              <div className="grid grid-cols-4 gap-2">
                {BUBBLE_COLORS.map(color => (
                  <button key={color} onClick={() => {
                    setProfile(p => ({ ...p, bubble_color: color }))
                    handleSave()
                  }}
                    className={`w-12 h-12 rounded-lg transition-all ${profile.bubble_color === color ? 'scale-110 ring-2' : ''}`}
                    style={{
                      background: color,
                    }} />
                ))}
              </div>
            </FieldCard>

            {/* Languages Settings */}
            <FieldCard icon={<BookOpen size={15} />} label={t('sections.languages')}>
              <div className="space-y-3">
                {([
                  { labelKey: 'langs.native', key: 'nativelang' },
                  { labelKey: 'langs.target', key: 'targetLang' },
                ] as const).map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-32 flex-shrink-0" style={{ color: 'var(--text3)' }}>{t(f.labelKey as any)}</span>
                    {isEditing
                      ? <select value={(profile as any)[f.key] || ''} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        <option value="">{t('langs.selectLang')}</option>
                        {LANG_OPTS.map(l => <option key={l} value={l}>{t(`langs.${l}` as any)}</option>)}
                      </select>
                      : <span className="text-sm" style={{ color: 'var(--text2)' }}>{(profile as any)[f.key] ? t(`langs.${(profile as any)[f.key]}` as any) : t('country.empty')}</span>}
                  </div>
                ))}
                {/* Level CEFR */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-32 flex-shrink-0" style={{ color: 'var(--text3)' }}>{t('langs.level')}</span>
                  {isEditing
                    ? <div className="flex gap-1.5 flex-wrap">
                      {LEVEL_OPTIONS.map(l => (
                        <button key={l} onClick={() => setProfile(p => ({ ...p, level: l }))}
                          className="text-xs px-2.5 py-1 rounded-full font-bold transition-all"
                          style={{ background: profile.level === l ? (LEVEL_COLORS[l]?.text || 'var(--primary)') : LEVEL_COLORS[l]?.bg || 'var(--surface2)', color: profile.level === l ? '#fff' : LEVEL_COLORS[l]?.text || 'var(--text2)' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                    : <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ background: levelColor.bg, color: levelColor.text }}>{profile.level || t('country.empty')}</span>}
                </div>
              </div>
            </FieldCard>

            {/* Location */}
            <FieldCard icon={<Globe size={15} />} label={t('sections.location')}>
              {isEditing
                ? <input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder={t('country.placeholder')} className="w-full outline-none text-sm px-2 py-1.5 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                : <p className="text-sm" style={{ color: 'var(--text2)' }}>{profile.country || t('country.empty')} {isEditing && <button onClick={() => setIsEditing(true)} className="text-xs ml-2 opacity-50">Editar</button>}</p>}
            </FieldCard>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{label}</p>
      </div>
      {children}
    </div>
  )
}