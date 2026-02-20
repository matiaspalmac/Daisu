"use client";

import { Link } from '@/i18n/routing';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MessageCircle, Home, User, LogOut, Book, Menu, X, ChevronDown, FileText, Newspaper, Users, Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/app/[locale]/localeswitcher';
import { useTheme } from '@/components/theme-provider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

const resolveImageSrc = (src?: string) => {
    if (!src) return '';
    const trimmed = src.trim();
    if (!trimmed || trimmed.startsWith('data:')) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (!API) return '';

    // Clean up any double slashes or missing slashes
    const baseUrl = API.replace(/\/+$/, '');
    const path = trimmed.replace(/^\/+/, '');

    return `${baseUrl}/${path}`;
};

export default function Header() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userAvatar, setUserAvatar] = useState('');
    const t = useTranslations('Header');
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        let cancelled = false;
        const fromSession = resolveImageSrc(session?.user?.image || '');
        if (fromSession) {
            setUserAvatar(fromSession);
            return;
        }
        if (!session?.user?.id) {
            setUserAvatar('');
            return;
        }

        fetch(`${API}/api/users/${session.user.id}`)
            .then(r => r.json())
            .then((u) => {
                if (cancelled) return;
                setUserAvatar(resolveImageSrc(u?.image || ''));
            })
            .catch(() => {
                if (!cancelled) setUserAvatar('');
            });

        return () => { cancelled = true; };
    }, [session?.user?.id, session?.user?.image]);

    const navItems = [
        { href: "/", icon: Home, label: t('home') },
        { href: "/languages", icon: Book, label: t('languages') },
        { href: "/resources", icon: FileText, label: t('resources') },
        { href: "/news", icon: Newspaper, label: t('news') },
        { href: "/membership", icon: Users, label: t('membership') },
        { href: "/chat", icon: MessageCircle, label: t('chat') },
    ];

    return (
        <nav
            className="sticky top-0 z-50 border-b"
            style={{
                height: 'var(--nav-h)',
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 1px 3px var(--shadow)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div className="h-full flex items-center justify-between px-4 mx-auto" style={{ maxWidth: '1280px' }}>
                {/* Logo */}
                <Link href="/" className="text-xl font-bold flex-shrink-0" style={{ color: 'var(--primary)' }}>
                    Daisu
                </Link>

                {/* Nav items — desktop */}
                <div className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                            style={{ color: 'var(--text2)' }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                (e.currentTarget as HTMLElement).style.color = 'var(--text2)';
                            }}
                        >
                            <item.icon size={17} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    <LocaleSwitcher />

                    {/* Dark/Light toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                        style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--surface3)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--surface2)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text2)';
                        }}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* User menu */}
                    {session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-all duration-150"
                                    style={{ background: 'var(--surface2)' }}
                                >
                                    {userAvatar ? (
                                        <img src={userAvatar} alt={session.user.name || "User"} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface3)' }}>
                                            <User size={16} style={{ color: 'var(--text2)' }} />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium hidden md:inline" style={{ color: 'var(--text)' }}>{session.user.name}</span>
                                    <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px var(--shadow)' }}>
                                <DropdownMenuLabel className="px-3 py-2">
                                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Cuenta</p>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{session.user.name}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {!!session.user.isAdmin && (
                                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                        <Link href="/dashboard" className="flex items-center gap-3 py-2 px-3" style={{ color: 'var(--text)' }}>
                                            <Home size={16} style={{ color: 'var(--primary)' }} />
                                            <span>{t("dashboard")}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                    <Link href="/profile" className="flex items-center gap-3 py-2 px-3" style={{ color: 'var(--text)' }}>
                                        <User size={16} style={{ color: 'var(--primary)' }} />
                                        <span>{t("profile")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                    <Link href="/chat" className="flex items-center gap-3 py-2 px-3" style={{ color: 'var(--text)' }}>
                                        <MessageCircle size={16} style={{ color: 'var(--primary)' }} />
                                        <span>{t("chat")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                    <Link href="/resources" className="flex items-center gap-3 py-2 px-3" style={{ color: 'var(--text)' }}>
                                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                                        <span>{t("resources")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                    <Link href="/membership" className="flex items-center gap-3 py-2 px-3" style={{ color: 'var(--text)' }}>
                                        <Users size={16} style={{ color: 'var(--primary)' }} />
                                        <span>{t("membership")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <div className="h-px my-1" style={{ background: 'var(--border)' }} />
                                <DropdownMenuItem onSelect={async () => { await signOut({ callbackUrl: "/" }); }} className="rounded-lg cursor-pointer" style={{ color: '#ef4444' }}>
                                    <LogOut size={16} className="mr-3" />
                                    <span>{t("signOut")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href="/login">
                            <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150" style={{ background: 'var(--primary)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}
                            >
                                {t("signIn")}
                            </button>
                        </Link>
                    )}

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t py-2 px-4 flex flex-col gap-1" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                            style={{ color: 'var(--text)' }}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <item.icon size={18} style={{ color: 'var(--primary)' }} />
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}