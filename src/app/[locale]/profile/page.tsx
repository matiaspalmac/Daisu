/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { showToast as toast } from 'nextjs-toast-notify'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User, Mail, FileText, Globe, BookOpen, Camera, Edit2, Check, X, Plus, Tag } from 'lucide-react'
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

interface UserProfile {
  id: number; name: string; email: string; image: string; cover_image: string;
  isAdmin: boolean; bio: string; nativelang: string; learninglang: string;
  targetLang: string; level: string; country: string;
  interests: string[]; tandem_goal: string; created_at: string;
}
interface Stats { messages_sent: number; corrections_given: number; streak: number; unique_words_this_week: number; longest_sentence_words: number; messages_this_week: number; last_active: string; }

export default function ProfilePage() {
  const t = useTranslations('ProfilePage')
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<UserProfile>({
    id: 0, name: '', email: '', image: '', cover_image: '', isAdmin: false,
    bio: '', nativelang: '', learninglang: '', targetLang: '', level: 'A1',
    country: '', interests: [], tandem_goal: '', created_at: '',
  })
  const [stats, setStats] = useState<Stats | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newInterest, setNewInterest] = useState('')
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
      created_at: s.created_at || '',
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
        }))
      })
      .catch(() => { })
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`${url_env}/api/user/stats/${session.user.id}`)
      .then(r => r.json()).then(d => { if (!d.error) setStats(d) }).catch(() => { })
  }, [session])

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
      await update({ ...session, user: { ...session?.user, ...normalizedProfile } })
      setIsEditing(false)
      toast.success(t('toast.saved'))
    } catch { toast.error(t('toast.error')) }
  }

  const addInterest = (tag: string) => {
    if (!tag.trim() || profile.interests.includes(tag.trim())) return
    setProfile(p => ({ ...p, interests: [...p.interests, tag.trim()] }))
    setNewInterest('')
  }
  const removeInterest = (tag: string) => setProfile(p => ({ ...p, interests: p.interests.filter(i => i !== tag) }))

  const levelColor = LEVEL_COLORS[profile.level] || { bg: 'var(--surface2)', text: 'var(--text2)' }
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : ''

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

      <div className="max-w-2xl mx-auto px-4">
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

        {/* Stats cards */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: '💬', value: stats.messages_this_week, label: t('stats.messagesWeek') },
              { icon: '📚', value: stats.unique_words_this_week, label: t('stats.uniqueWords') },
              { icon: '✍️', value: t('stats.longestSentence', { count: stats.longest_sentence_words }), label: t('stats.longestLabel') },
              { icon: '✅', value: stats.corrections_given, label: t('stats.corrections') },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xl mb-0.5">{s.icon}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Main form */}
        <div className="space-y-4">
          {/* Bio */}
          <FieldCard icon={<FileText size={15} />} label={t('sections.bio')}>
            {isEditing
              ? <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder={t('bio.placeholder')} className="w-full resize-none outline-none text-sm p-2 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              : <p className="text-sm" style={{ color: profile.bio ? 'var(--text2)' : 'var(--text3)' }}>{profile.bio || t('bio.empty')}</p>}
          </FieldCard>

          {/* Country + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldCard icon={<Globe size={15} />} label={t('sections.location')}>
              {isEditing
                ? <input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder={t('country.placeholder')} className="w-full outline-none text-sm px-2 py-1.5 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                : <p className="text-sm" style={{ color: 'var(--text2)' }}>{profile.country || t('country.empty')}</p>}
            </FieldCard>
            <FieldCard icon={<Mail size={15} />} label={t('sections.email')}>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>{profile.email}</p>
            </FieldCard>
          </div>

          {/* Languages */}
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

          {/* Tandem goal */}
          <FieldCard icon={<User size={15} />} label={t('sections.tandemGoal')}>
            {isEditing
              ? <textarea value={profile.tandem_goal} onChange={e => setProfile(p => ({ ...p, tandem_goal: e.target.value }))} rows={2} placeholder={t('tandemGoal.placeholder')} className="w-full resize-none outline-none text-sm p-2 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              : <p className="text-sm" style={{ color: profile.tandem_goal ? 'var(--text2)' : 'var(--text3)' }}>{profile.tandem_goal || t('tandemGoal.empty')}</p>}
          </FieldCard>
        </div>
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