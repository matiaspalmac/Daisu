/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { showToast as toast } from 'nextjs-toast-notify'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { FileText, Globe, BookOpen, Camera, Edit2, Check, X, Plus, Tag, Users, Lock, Bell, Palette, Eye, Heart, MessageCircle, AlertTriangle, Crown, Trophy, Star, BarChart2, TrendingUp, TrendingDown, Flame, BookMarked, Hash, Loader2, KeyRound } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { OnlineIndicator, usePresence, PresenceBadge } from '@/components/OnlineIndicator'

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
interface MembershipInfo { tier: string; plan_name?: string; expires_at?: string | null; }

interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  category: string
  xp_reward: number
  earned: boolean
  earned_at?: string | null
}

interface XpData {
  xp: number
  level: number
  log: Array<{ id: number; amount: number; reason: string; created_at: string }>
}

interface HeatmapDay { date: string; count: number }
interface ProgressWeek { week_start: string; messages: number; vocabulary: number }
interface WeeklyDigest {
  messages_this_week: number
  messages_prev_week: number
  vocabulary_this_week: number
  vocabulary_prev_week: number
  current_streak: number
  most_active_room?: string
  language_distribution?: Array<{ language: string; percentage: number }>
}
interface UserStatsDetail {
  messages_sent: number
  words_sent: number
  streak: number
  unique_words: number
  longest_sentence: number
}

type Tab = 'overview' | 'connections' | 'privacy' | 'customization' | 'achievements' | 'stats'

export default function ProfilePage() {
  const t = useTranslations('ProfilePage')
  const locale = useLocale()
  const { data: session, update } = useSession()
  const profileFetchRef = useRef<{ userId?: number; ts: number }>({ ts: 0 })
  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<UserProfile>({
    id: 0, name: '', email: '', image: '', cover_image: '', isAdmin: false,
    bio: '', nativelang: '', learninglang: '', targetLang: '', level: 'A1',
    country: '', interests: [], tandem_goal: '', created_at: '',
    bubble_color: '#2d88ff', is_public: true, hide_old_messages: false,
  })
  const [stats, setStats] = useState<Stats | null>(null)
  const [membership, setMembership] = useState<MembershipInfo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [followers, setFollowers] = useState<Follower[]>([])
  const [blockedUsers, setBlockedUsers] = useState<Follower[]>([])
  const [profileViews, setProfileViews] = useState<Array<{id: number; name: string; viewed_at: string}>>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [xpData, setXpData] = useState<XpData | null>(null)
  const [achievementCategory, setAchievementCategory] = useState<string>('all')
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([])
  const [progressData, setProgressData] = useState<ProgressWeek[]>([])
  const [digestData, setDigestData] = useState<WeeklyDigest | null>(null)
  const [statsDetail, setStatsDetail] = useState<UserStatsDetail | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const profileCacheTtlMs = 2 * 60 * 1000

  // ── Own presence (the logged-in user's profile is always "you") ──────────────
  const selfId = profile.id > 0 ? profile.id : null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const selfPresence = usePresence(selfId, 60_000)

  // Suggestions from locale keys
  const INTEREST_SUGGESTIONS = Array.from({ length: 14 }, (_, i) => t(`interests.s${i}` as any))

  useEffect(() => {
    if (!session?.user) return
    const s = session.user as any
    let interests: string[] = []
    try { interests = Array.isArray(s.interests) ? s.interests : JSON.parse(s.interests || '[]') } catch { interests = [] }
    setProfile(prev => ({
      ...prev,
      id: s.id ?? prev.id,
      name: s.name ?? prev.name,
      email: s.email ?? prev.email,
      image: s.image || prev.image,
      cover_image: s.cover_image || prev.cover_image,
      isAdmin: typeof s.isAdmin === 'boolean' ? s.isAdmin : Boolean(s.isAdmin ?? prev.isAdmin),
      bio: s.bio ?? prev.bio,
      nativelang: s.nativelang ?? prev.nativelang,
      learninglang: s.learninglang ?? prev.learninglang,
      targetLang: s.targetLang ?? prev.targetLang,
      level: s.level ?? prev.level,
      country: s.country ?? prev.country,
      interests: interests.length > 0 ? interests : prev.interests,
      tandem_goal: s.tandem_goal ?? prev.tandem_goal,
      created_at: s.created_at ?? prev.created_at,
      bubble_color: s.bubble_color ?? prev.bubble_color,
      is_public: s.is_public !== undefined ? s.is_public !== false : prev.is_public,
      hide_old_messages: s.hide_old_messages !== undefined ? Boolean(s.hide_old_messages) : prev.hide_old_messages,
    }))
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return
    const userId = Number(session.user.id)
    const cacheKey = `daisu-profile-${userId}`
    const now = Date.now()

    if (profileFetchRef.current.userId === userId && (now - profileFetchRef.current.ts) < profileCacheTtlMs) {
      return
    }

    try {
      const cachedRaw = sessionStorage.getItem(cacheKey)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw)
        if (cached?.ts && (now - Number(cached.ts)) < profileCacheTtlMs && cached?.profile) {
          const u = cached.profile
          let interests: string[] = []
          try { interests = Array.isArray(u.interests) ? u.interests : JSON.parse(u.interests || '[]') } catch { interests = [] }
          setProfile(p => ({
            ...p,
            id: u.id ?? p.id,
            name: u.name || p.name,
            email: u.email || p.email,
            image: u.image || p.image,
            cover_image: u.cover_image || p.cover_image,
            isAdmin: Boolean(u.isAdmin),
            bio: u.bio || p.bio,
            nativelang: u.nativelang || p.nativelang,
            learninglang: u.learninglang || p.learninglang,
            targetLang: u.targetLang || p.targetLang,
            level: u.level || p.level,
            country: u.country || p.country,
            interests: interests.length > 0 ? interests : p.interests,
            tandem_goal: u.tandem_goal || p.tandem_goal,
            created_at: u.created_at || p.created_at,
            bubble_color: u.bubble_color || p.bubble_color,
            is_public: u.is_public !== false,
            hide_old_messages: Boolean(u.hide_old_messages),
          }))
          profileFetchRef.current = { userId, ts: now }
        }
      }
    } catch { }

    fetch(`${url_env}/api/users/${session.user.id}`)
      .then(r => r.json())
      .then(u => {
        if (!u || u.error) return
        profileFetchRef.current = { userId, ts: Date.now() }
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), profile: u }))
        } catch { }
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
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    apiFetch('/api/memberships/my')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error && d.tier) setMembership(d) })
      .catch(() => { })
  }, [session?.user?.id])

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

  // Fetch achievements & XP when tab is active
  useEffect(() => {
    if (tab !== 'achievements' || !session?.user?.id) return
    apiFetch('/api/achievements')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAchievements(d) })
      .catch(() => { })
    apiFetch(`/api/users/${session.user.id}/xp`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setXpData(d) })
      .catch(() => { })
  }, [tab, session?.user?.id])

  // Fetch stats dashboard data when stats tab is active
  useEffect(() => {
    if (tab !== 'stats' || !session?.user?.id) return
    const uid = session.user.id
    setStatsLoading(true)
    Promise.all([
      apiFetch('/api/user/stats/' + uid).then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch('/api/user/stats/' + uid + '/heatmap').then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch('/api/user/stats/' + uid + '/progress').then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch('/api/user/stats/' + uid + '/digest').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([detail, heatmap, progress, digest]) => {
      if (detail && !detail.error) setStatsDetail(detail)
      if (Array.isArray(heatmap)) setHeatmapData(heatmap)
      if (Array.isArray(progress)) setProgressData(progress)
      if (digest && !digest.error) setDigestData(digest)
    }).finally(() => setStatsLoading(false))
  }, [tab, session?.user?.id])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'cover_image') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidImage'))
      e.target.value = ''
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('toast.imageTooLarge'))
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
    }).then(() => toast.success(newValue ? t('privacy.oldMessagesHidden') : t('privacy.oldMessagesVisible')))
      .catch(() => { setProfile(p => ({ ...p, hide_old_messages: !newValue })); toast.error(t('toast.error')) })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cpNew !== cpConfirm) {
      toast.error(t('privacy.changePasswordErrorMismatch'), { duration: 5000 })
      return
    }
    setCpLoading(true)
    try {
      const res = await apiFetch('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401 || res.status === 400) {
          toast.error(data.message || t('privacy.changePasswordErrorCurrent'), { duration: 5000 })
        } else {
          toast.error(t('privacy.changePasswordError'), { duration: 5000 })
        }
        return
      }
      toast.success(t('privacy.changePasswordSuccess'), { duration: 3000 })
      setCpCurrent('')
      setCpNew('')
      setCpConfirm('')
    } catch {
      toast.error(t('privacy.changePasswordError'), { duration: 5000 })
    } finally {
      setCpLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteEmailInput.trim().toLowerCase() !== profile.email.toLowerCase()) {
      toast.error(t('privacy.deleteAccountEmailMismatch'), { duration: 4000 })
      return
    }
    setDeleteLoading(true)
    try {
      const res = await apiFetch(`/api/deleteuser/${profile.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t('privacy.deleteAccountSuccess'), { duration: 5000 })
      setShowDeleteModal(false)
      setTimeout(() => { window.location.href = '/login' }, 2000)
    } catch {
      toast.error(t('privacy.deleteAccountError'), { duration: 5000 })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const res = await apiFetch(`/api/users/${profile.id}/export`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daisu-data-${profile.id}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('privacy.exportDataSuccess'), { duration: 3000 })
    } catch {
      toast.error(t('privacy.exportDataError'), { duration: 5000 })
    } finally {
      setExportLoading(false)
    }
  }

  const unblockUser = async (userId: number) => {
    await fetch(`${url_env}/api/users/${session?.user?.id}/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedUserId: userId })
    })
      .then(() => {
        setBlockedUsers(p => p.filter(u => u.id !== userId))
        toast.success(t('connections.unblocked'))
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
  const getHoursSinceLastActive = (value?: string) => {
    if (!value) return 0
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 0
    const diffMs = Date.now() - parsed.getTime()
    return Math.max(0, Math.round(diffMs / 3600000))
  }

  // XP helpers
  const xpLevel = xpData ? xpData.level : 1
  const xpTotal = xpData ? xpData.xp : 0
  const xpInCurrentLevel = xpTotal - (xpLevel - 1) * 100
  const xpToNextLevel = 100 - xpInCurrentLevel
  const xpProgressPct = Math.min(100, xpInCurrentLevel)

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: `👤 ${t('tabs.overview')}`, icon: MessageCircle },
    { id: 'connections', label: `👥 ${t('tabs.connections')}`, icon: Users },
    { id: 'privacy', label: `🔐 ${t('tabs.privacy')}`, icon: Lock },
    { id: 'customization', label: `✨ ${t('tabs.customization')}`, icon: Palette },
    { id: 'achievements', label: `🏆 ${t('tabs.achievements')}`, icon: Trophy },
    { id: 'stats', label: `📊 ${t('tabs.stats')}`, icon: BarChart2 },
  ]

  const ACHIEVEMENT_CATEGORIES = ['all', 'chat', 'streak', 'vocabulary', 'social', 'special']

  const filteredAchievements = achievementCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === achievementCategory)

  const earnedCount = achievements.filter(a => a.earned).length

  return (
    <div className="min-h-screen pb-12 bg-[var(--bg)]">
      {/* Cover photo */}
      <div className="relative h-36 sm:h-48 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1f35, #0f1117)' }}>
        {profile.cover_image && <Image src={profile.cover_image} alt="cover" fill className="object-cover" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--primary)30, #8b5cf630)' }} />
        {isEditing && (
          <>
            <button onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-[rgba(0,0,0,0.6)] text-white backdrop-blur-sm">
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
                : <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white bg-[var(--primary)]">{profile.name[0]}</div>}
            </div>
            {isEditing && (
              <button onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--primary)] border-2 border-[var(--bg)]">
                <Camera size={13} className="text-white" />
              </button>
            )}
            {!isEditing && selfPresence && (
              <OnlineIndicator
                isOnline={selfPresence.isOnline}
                size={16}
                className="absolute bottom-1 right-1"
              />
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'image')} />
          </div>

          <div className="absolute top-14 left-28 sm:left-32 flex items-center gap-2 flex-wrap">
            {profile.isAdmin && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[rgba(45,136,255,0.15)] text-[#2d88ff]">{t('adminBadge')}</span>}
            {profile.level && <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: levelColor.bg, color: levelColor.text }}>{profile.level}</span>}
            {!profile.is_public && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#ef444220] text-[#ef4444]">{t('privacy.privateBadge')}</span>}
            {membership && membership.tier && membership.tier !== 'free' && membership.tier !== 'basic' && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#f59e0b20] text-[#f59e0b]">
                <Crown size={10} /> {membership.plan_name || membership.tier}
              </span>
            )}
          </div>

          <div className="absolute top-0 right-0 flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--primary)]">
                  <Check size={14} /> {t('saveButton')}
                </button>
                <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)]">
                  <X size={14} />
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]">
                <Edit2 size={14} /> {t('editButton')}
              </button>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {isEditing
              ? <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="text-2xl font-bold outline-none border-b-2 w-full text-[var(--text)] border-[var(--primary)] bg-transparent" />
              : <h1 className="text-2xl font-bold text-[var(--text)]">{profile.name}</h1>}
            {selfPresence && (
              <PresenceBadge
                presence={selfPresence}
                locale={locale}
                labels={{
                  online: t('presence.online'),
                  lastSeen: t('presence.lastSeen'),
                }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs mt-1 text-[var(--text3)]">
            {memberSince && <span>{t('since', { date: memberSince })}</span>}
            {stats?.last_active && <span>{t('lastActive', { hours: getHoursSinceLastActive(stats.last_active) })}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                tab === t.id
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--surface)] text-[var(--text2)] border-[var(--border)]'
              }`}>
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
                  { icon: '💬', value: stats.messages_sent || 0, label: t('stats.totalMessages') },
                  { icon: '✅', value: stats.streak || 0, label: t('stats.streakDays') },
                  { icon: '🏆', value: stats.corrections_given || 0, label: t('stats.correctionsTotal') },
                  { icon: '📊', value: stats.unique_words_this_week || 0, label: t('stats.uniqueWordsTotal') },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl text-center bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-xl mb-0.5">{s.icon}</p>
                    <p className="text-lg font-bold text-[var(--text)]">{s.value}</p>
                    <p className="text-[10px] text-[var(--text3)]">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Membership */}
            {membership && (
              <FieldCard icon={<Crown size={15} />} label={t('membership.title')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {membership.tier === 'free' || membership.tier === 'basic'
                        ? t('membership.freeTier')
                        : membership.plan_name || membership.tier}
                    </p>
                    {membership.expires_at && (
                      <p className="text-xs mt-0.5 text-[var(--text3)]">
                        {t('membership.expiresAt', { date: new Date(membership.expires_at).toLocaleDateString() })}
                      </p>
                    )}
                    {(!membership.tier || membership.tier === 'free' || membership.tier === 'basic') && (
                      <p className="text-xs mt-0.5 text-[var(--text3)]">{t('membership.upgradeHint')}</p>
                    )}
                  </div>
                  {(membership.tier === 'free' || membership.tier === 'basic' || !membership.tier) ? (
                    <a href="/membership" className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white bg-[var(--primary)]">
                      {t('membership.upgrade')}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold bg-[#f59e0b20] text-[#f59e0b]">
                      <Crown size={11} /> {t('membership.active')}
                    </span>
                  )}
                </div>
              </FieldCard>
            )}

            {/* Favorite Rooms */}
            {stats?.favorite_rooms && stats.favorite_rooms.length > 0 && (
              <FieldCard icon={<span>🏠</span>} label={t('overview.favoriteRooms')}>
                <div className="space-y-2">
                  {stats.favorite_rooms.slice(0, 5).map((room, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text2)]">{room.name}</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-[var(--primary)20] text-[var(--primary)]">{t('overview.msgs', { count: room.message_count })}</span>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Languages Stats */}
            {stats?.languages_stats && stats.languages_stats.length > 0 && (
              <FieldCard icon={<Globe size={15} />} label={t('overview.languagesPracticed')}>
                <div className="space-y-2">
                  {stats.languages_stats.map((lang, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1 text-[var(--text2)]">
                        <span>{lang.language}</span>
                        <span>{Math.round(lang.percentage)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[var(--surface2)]">
                        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${lang.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Bio */}
            <FieldCard icon={<FileText size={15} />} label={t('sections.bio')}>
              {isEditing
                ? <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder={t('bio.placeholder')} className="w-full resize-none outline-none text-sm p-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]" />
                : <p className="text-sm" style={{ color: profile.bio ? 'var(--text2)' : 'var(--text3)' }}>{profile.bio || t('bio.empty')}</p>}
            </FieldCard>

            {/* Interests */}
            <FieldCard icon={<Tag size={15} />} label={t('sections.interests')}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.interests.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                    #{tag}
                    {isEditing && <button onClick={() => removeInterest(tag)} className="ml-0.5 opacity-60 hover:opacity-100"><X size={10} /></button>}
                  </span>
                ))}
                {profile.interests.length === 0 && !isEditing && <p className="text-sm text-[var(--text3)]">{t('interests.noInterests')}</p>}
              </div>
              {isEditing && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input value={newInterest} onChange={e => setNewInterest(e.target.value)} placeholder={t('interests.add')}
                      onKeyDown={e => e.key === 'Enter' && addInterest(newInterest)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]" />
                    <button onClick={() => addInterest(newInterest)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--primary)]">
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {INTEREST_SUGGESTIONS.filter(s => !profile.interests.includes(s)).slice(0, 8).map(s => (
                      <button key={s} onClick={() => addInterest(s)} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--text3)] border border-[var(--border)]">+{s}</button>
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
            <FieldCard icon={<Heart size={15} />} label={t('connections.followers', { count: followers.length })}>
              {followers.length === 0 ? (
                <p className="text-sm text-[var(--text3)]">{t('connections.noFollowers')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {followers.map(f => (
                    <div key={f.id} className="p-2 rounded-lg text-center bg-[var(--surface2)]">
                      <div className="w-12 h-12 rounded-full mx-auto mb-1 overflow-hidden">
                        {f.image ? <Image src={f.image} alt={f.name} width={48} height={48} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold">{f.name[0]}</div>}
                      </div>
                      <p className="text-xs font-semibold truncate text-[var(--text)]">{f.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </FieldCard>

            {/* Blocked Users */}
            {blockedUsers.length > 0 && (
              <FieldCard icon={<AlertTriangle size={15} />} label={t('connections.blockedUsers', { count: blockedUsers.length })}>
                <div className="space-y-2">
                  {blockedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface2)]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          {u.image ? <Image src={u.image} alt={u.name} width={32} height={32} className="object-cover w-full h-full" />
                            : <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-bold">{u.name[0]}</div>}
                        </div>
                        <span className="text-xs font-semibold text-[var(--text2)]">{u.name}</span>
                      </div>
                      <button onClick={() => unblockUser(u.id)} className="text-xs px-2 py-1 rounded-lg font-semibold bg-[#10b98120] text-[#10b981]">
                        {t('connections.unblock')}
                      </button>
                    </div>
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Profile Views */}
            {profileViews.length > 0 && (
              <FieldCard icon={<Eye size={15} />} label={t('connections.profileViews', { count: profileViews.length })}>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {profileViews.map(view => (
                    <div key={view.id} className="flex items-center justify-between p-2 rounded-lg text-xs bg-[var(--surface2)]">
                      <span className="text-[var(--text2)]">{view.name}</span>
                      <span className="text-[var(--text3)]">
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
            <FieldCard icon={<Lock size={15} />} label={t('privacy.title')}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{t('privacy.profileStatus', { status: profile.is_public ? t('privacy.publicState') : t('privacy.privateState') })}</p>
                    <p className="text-xs mt-0.5 text-[var(--text3)]">
                      {profile.is_public ? t('privacy.publicDesc') : t('privacy.privateDesc')}
                    </p>
                  </div>
                  <button onClick={togglePrivacy}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                    style={{ background: profile.is_public ? '#ef4444' : '#10b981' }}>
                    {profile.is_public ? t('privacy.makePrivate') : t('privacy.makePublic')}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{t('privacy.hideOldMessagesTitle')}</p>
                    <p className="text-xs mt-0.5 text-[var(--text3)]">
                      {profile.hide_old_messages ? t('privacy.hideOldMessagesOn') : t('privacy.hideOldMessagesOff')}
                    </p>
                  </div>
                  <button onClick={toggleHideOldMessages}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                    style={{ background: profile.hide_old_messages ? '#10b981' : '#3b82f6' }}>
                    {profile.hide_old_messages ? t('privacy.showAll') : t('privacy.hide')}
                  </button>
                </div>
              </div>
            </FieldCard>

            <FieldCard icon={<Bell size={15} />} label={t('privacy.notificationsTitle')}>
              <p className="text-sm text-[var(--text3)]">{t('privacy.notificationsDesc')}</p>
            </FieldCard>

            <FieldCard icon={<KeyRound size={15} />} label={t('privacy.changePasswordTitle')}>
              <form onSubmit={handleChangePassword} className="space-y-2">
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                  <input
                    type="password"
                    value={cpCurrent}
                    onChange={e => setCpCurrent(e.target.value)}
                    required
                    placeholder={t('privacy.currentPasswordPlaceholder')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                  <input
                    type="password"
                    value={cpNew}
                    onChange={e => setCpNew(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t('privacy.newPasswordPlaceholder')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                  <input
                    type="password"
                    value={cpConfirm}
                    onChange={e => setCpConfirm(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t('privacy.confirmPasswordPlaceholder')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={cpLoading}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'var(--primary)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}>
                  {cpLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {cpLoading ? t('privacy.changePasswordSubmitting') : t('privacy.changePasswordSubmit')}
                </button>
              </form>
            </FieldCard>

            {/* Export Data */}
            <FieldCard icon={<FileText size={15} />} label={t('privacy.exportDataTitle')}>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{t('privacy.exportDataTitle')}</p>
                  <p className="text-xs mt-0.5 text-[var(--text3)]">{t('privacy.exportDataDesc')}</p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="ml-4 flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white"
                  style={{ background: '#3b82f6' }}
                >
                  {exportLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {t('privacy.exportDataButton')}
                </button>
              </div>
            </FieldCard>

            {/* Danger Zone — Delete Account */}
            <FieldCard icon={<AlertTriangle size={15} />} label={t('privacy.deleteAccountTitle')}>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#ef444412] border border-[#ef444430]">
                <div>
                  <p className="text-sm font-semibold text-[#ef4444]">{t('privacy.deleteAccountTitle')}</p>
                  <p className="text-xs mt-0.5 text-[var(--text3)]">{t('privacy.deleteAccountDesc')}</p>
                </div>
                <button
                  onClick={() => { setDeleteEmailInput(''); setShowDeleteModal(true) }}
                  className="ml-4 flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm text-white bg-[#ef4444]"
                >
                  {t('privacy.deleteAccountButton')}
                </button>
              </div>
            </FieldCard>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.75)]" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <div className="rounded-2xl p-6 w-full max-w-sm bg-[var(--surface)] border border-[#ef444440]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#ef444420]">
                  <AlertTriangle size={20} className="text-[#ef4444]" />
                </div>
                <h3 className="font-bold text-[var(--text)]">{t('privacy.deleteAccountConfirmTitle')}</h3>
              </div>
              <p className="text-sm text-[var(--text3)] mb-4">{t('privacy.deleteAccountConfirmDesc')}</p>
              <input
                type="email"
                value={deleteEmailInput}
                onChange={e => setDeleteEmailInput(e.target.value)}
                placeholder={t('privacy.deleteAccountEmailPlaceholder')}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-4"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-[var(--border)] text-[var(--text2)] bg-[var(--surface2)]"
                >
                  {t('privacy.deleteAccountCancelButton')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || !deleteEmailInput.trim()}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-1.5 bg-[#ef4444] disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t('privacy.deleteAccountConfirmButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMIZATION TAB */}
        {tab === 'customization' && (
          <div className="space-y-4">
            {/* Bubble Color */}
            <FieldCard icon={<Palette size={15} />} label={t('customization.bubbleColor')}>
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
                    <span className="text-xs font-semibold w-32 flex-shrink-0 text-[var(--text3)]">{t(f.labelKey as any)}</span>
                    {isEditing
                      ? <select value={(profile as any)[f.key] || ''} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]">
                        <option value="">{t('langs.selectLang')}</option>
                        {LANG_OPTS.map(l => <option key={l} value={l}>{t(`langs.${l}` as any)}</option>)}
                      </select>
                      : <span className="text-sm text-[var(--text2)]">{(profile as any)[f.key] ? t(`langs.${(profile as any)[f.key]}` as any) : t('country.empty')}</span>}
                  </div>
                ))}
                {/* Level CEFR */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-32 flex-shrink-0 text-[var(--text3)]">{t('langs.level')}</span>
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
                ? <input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder={t('country.placeholder')} className="w-full outline-none text-sm px-2 py-1.5 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]" />
                : <p className="text-sm text-[var(--text2)]">{profile.country || t('country.empty')}</p>}
            </FieldCard>
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {tab === 'achievements' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* XP & Level card */}
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <Star size={15} className="text-[var(--primary)]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">{t('achievements.xpTitle')}</p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white bg-[var(--primary)]">
                    {xpLevel}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">{t('achievements.level', { level: xpLevel })}</p>
                    <p className="text-xs text-[var(--text3)]">{t('achievements.xpProgress', { xp: xpTotal })}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text3)]">{t('achievements.xpToNext', { remaining: Math.max(0, 100 - (xpTotal - (xpLevel - 1) * 100)) })}</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[var(--surface2)]">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[var(--primary)]"
                  style={{ width: `${Math.min(100, Math.max(0, xpTotal - (xpLevel - 1) * 100))}%` }}
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['all', 'chat', 'streak', 'vocabulary', 'social', 'special'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setAchievementCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    achievementCategory === cat
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--surface)] text-[var(--text2)] border-[var(--border)]'
                  }`}
                >
                  {t(`achievements.categories.${cat}` as any)}
                </button>
              ))}
            </div>

            {/* Achievement count */}
            <p className="text-xs px-1 text-[var(--text3)]">
              {earnedCount} / {achievements.length} {t('achievements.earned')}
            </p>

            {/* Achievements grid */}
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-12 text-[var(--text3)]">
                <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('achievements.noAchievements')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredAchievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-xl bg-[var(--surface)] transition-all"
                    style={{
                      border: achievement.earned ? '1px solid var(--primary)' : '1px solid var(--border)',
                      opacity: achievement.earned ? 1 : 0.6,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: achievement.earned ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--surface2)' }}
                      >
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate text-[var(--text)]">{achievement.name}</p>
                          {achievement.earned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 bg-[#10b98120] text-[#10b981]">✓</span>
                          )}
                        </div>
                        <p className="text-xs mb-2 leading-relaxed text-[var(--text3)]">{achievement.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[var(--primary)]">
                            {t('achievements.xpReward', { xp: achievement.xp_reward })}
                          </span>
                          {achievement.earned && achievement.earned_at ? (
                            <span className="text-[10px] text-[var(--text3)]">
                              {t('achievements.earnedOn', { date: new Date(achievement.earned_at).toLocaleDateString() })}
                            </span>
                          ) : !achievement.earned ? (
                            <span className="text-[10px] text-[var(--text3)]">{t('achievements.locked')}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {statsLoading ? (
              <div className="flex items-center justify-center py-20 text-[var(--text3)]">
                <svg className="animate-spin w-8 h-8 opacity-60" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : (
              <>
                {/* General stats cards */}
                {statsDetail && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { icon: '💬', value: statsDetail.messages_sent, label: t('statsTab.messagesSent') },
                      { icon: '📝', value: statsDetail.words_sent, label: t('statsTab.wordsSent') },
                      { icon: '🔥', value: statsDetail.streak, label: t('statsTab.streak') },
                      { icon: '📖', value: statsDetail.unique_words, label: t('statsTab.uniqueWords') },
                      { icon: '✍️', value: statsDetail.longest_sentence, label: t('statsTab.longestSentence') },
                    ].map((s, i) => (
                      <div key={i} className="p-3 rounded-xl text-center bg-[var(--surface)] border border-[var(--border)]">
                        <p className="text-xl mb-0.5">{s.icon}</p>
                        <p className="text-xl font-bold text-[var(--text)]">{s.value ?? '—'}</p>
                        <p className="text-[10px] text-[var(--text3)] leading-tight mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Weekly digest */}
                {digestData && (
                  <FieldCard icon={<BarChart2 size={15} />} label={t('statsTab.weeklyDigest')}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface2)]">
                        <div>
                          <p className="text-xs text-[var(--text3)] mb-0.5">{t('statsTab.messagesThisWeek')}</p>
                          <p className="text-2xl font-bold text-[var(--text)]">{digestData.messages_this_week}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const prev = digestData.messages_prev_week || 0
                            const curr = digestData.messages_this_week || 0
                            const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0)
                            const up = curr >= prev
                            return (
                              <div className={'flex items-center gap-1 text-sm font-bold ' + (up ? 'text-[#10b981]' : 'text-[#ef4444]')}>
                                {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                <span>{up && pct > 0 ? '+' : ''}{pct}%</span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
                          <BookMarked size={14} className="text-[var(--primary)]" />
                          <span>{t('statsTab.vocabThisWeek')}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text)]">{digestData.vocabulary_this_week ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
                          <Flame size={14} className="text-[#f59e0b]" />
                          <span>{t('statsTab.currentStreak')}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text)]">{digestData.current_streak ?? 0} {t('statsTab.days')}</span>
                      </div>
                      {digestData.most_active_room && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
                            <Hash size={14} className="text-[var(--primary)]" />
                            <span>{t('statsTab.mostActiveRoom')}</span>
                          </div>
                          <span className="text-sm font-semibold text-[var(--text)] truncate max-w-[120px]">{digestData.most_active_room}</span>
                        </div>
                      )}
                      {digestData.language_distribution && digestData.language_distribution.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--text3)] mb-2">{t('statsTab.languageDistribution')}</p>
                          <div className="space-y-1.5">
                            {digestData.language_distribution.map((lang, i) => (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-0.5 text-[var(--text2)]">
                                  <span>{lang.language}</span>
                                  <span>{Math.round(lang.percentage)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden bg-[var(--surface)]">
                                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: lang.percentage + '%' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </FieldCard>
                )}

                {/* Activity Heatmap */}
                {heatmapData.length > 0 && (
                  <FieldCard icon={<TrendingUp size={15} />} label={t('statsTab.heatmapTitle')}>
                    <ActivityHeatmap data={heatmapData} />
                  </FieldCard>
                )}

                {/* Progress Bar Chart */}
                {progressData.length > 0 && (
                  <FieldCard icon={<BarChart2 size={15} />} label={t('statsTab.progressTitle')}>
                    <ProgressChart
                      data={progressData}
                      labelMessages={t('statsTab.messages')}
                      labelVocab={t('statsTab.vocabulary')}
                    />
                  </FieldCard>
                )}

                {/* Empty state */}
                {!statsDetail && !digestData && heatmapData.length === 0 && progressData.length === 0 && (
                  <div className="text-center py-16 text-[var(--text3)]">
                    <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{t('statsTab.noData')}</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function FieldCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--primary)]">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)]">{label}</p>
      </div>
      {children}
    </div>
  )
}


// ─── Activity Heatmap (GitHub-style 365-day grid) ───────────────────────────
function ActivityHeatmap({ data }: { data: Array<{ date: string; count: number }> }) {
  // Build a map of date -> count
  const countMap: Record<string, number> = {}
  data.forEach(d => { countMap[d.date] = d.count })

  // Build 365 days ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: Date[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d)
  }

  // Pad start so week starts on Sunday
  const firstDay = days[0].getDay() // 0=Sun
  const paddedDays: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...days,
  ]

  // Chunk into weeks
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7))
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)

  function getColor(count: number): string {
    if (count === 0) return 'var(--surface2)'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#0e4429'
    if (intensity < 0.5) return '#006d32'
    if (intensity < 0.75) return '#26a641'
    return '#39d353'
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS_LABEL = ['S','M','T','W','T','F','S']

  // Month labels: find first week each month appears
  const monthLabels: { weekIdx: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d !== null) as Date | undefined
    if (firstReal && firstReal.getMonth() !== lastMonth) {
      lastMonth = firstReal.getMonth()
      monthLabels.push({ weekIdx: wi, label: MONTHS[lastMonth] })
    }
  })

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
        {/* Month labels */}
        <div style={{ display: 'flex', gap: 2, paddingLeft: 18 }}>
          {weeks.map((_, wi) => {
            const ml = monthLabels.find(m => m.weekIdx === wi)
            return (
              <div key={wi} style={{ width: 10, fontSize: 8, color: 'var(--text3)', textAlign: 'center', overflow: 'visible', whiteSpace: 'nowrap' }}>
                {ml ? ml.label : ''}
              </div>
            )
          })}
        </div>
        {/* Grid */}
        <div style={{ display: 'flex', gap: 2 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 2 }}>
            {DAYS_LABEL.map((d, i) => (
              <div key={i} style={{ width: 10, height: 10, fontSize: 7, color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map((day, di) => {
                if (!day) return <div key={di} style={{ width: 10, height: 10 }} />
                const dateStr = day.toISOString().slice(0, 10)
                const count = countMap[dateStr] || 0
                return (
                  <div
                    key={di}
                    title={dateStr + ': ' + count + ' messages'}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: getColor(count),
                      cursor: count > 0 ? 'default' : 'default',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 18, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text3)' }}>Less</span>
          {['var(--surface2)', '#0e4429', '#006d32', '#26a641', '#39d353'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 9, color: 'var(--text3)' }}>More</span>
        </div>
      </div>
    </div>
  )
}

// ─── Progress Bar Chart (12-week messages + vocabulary) ─────────────────────
function ProgressChart({ data, labelMessages, labelVocab }: {
  data: Array<{ week_start: string; messages: number; vocabulary: number }>
  labelMessages: string
  labelVocab: string
}) {
  const maxVal = Math.max(...data.flatMap(d => [d.messages, d.vocabulary]), 1)

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-[var(--text3)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)' }} />
          {labelMessages}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#10b981' }} />
          {labelVocab}
        </div>
      </div>
      {/* Chart */}
      <div className="relative" style={{ height: 120 }}>
        <svg width="100%" height="120" viewBox={'0 0 ' + (data.length * 30) + ' 120'} preserveAspectRatio="none">
          {data.map((w, i) => {
            const msgH = Math.round((w.messages / maxVal) * 100)
            const vocH = Math.round((w.vocabulary / maxVal) * 100)
            const x = i * 30
            return (
              <g key={i}>
                <rect x={x + 2} y={120 - msgH} width={12} height={msgH} rx={2} fill="var(--primary)" opacity={0.8} />
                <rect x={x + 16} y={120 - vocH} width={12} height={vocH} rx={2} fill="#10b981" opacity={0.8} />
              </g>
            )
          })}
        </svg>
      </div>
      {/* X-axis labels */}
      <div className="flex mt-1 overflow-hidden">
        {data.map((w, i) => {
          const d = new Date(w.week_start)
          const label = (d.getMonth() + 1) + '/' + d.getDate()
          return (
            <div key={i} style={{ width: (100 / data.length) + '%', textAlign: 'center' }} className="text-[9px] text-[var(--text3)] truncate">
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
