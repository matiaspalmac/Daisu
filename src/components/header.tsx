"use client";

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { MessageCircle, Globe, Home, User, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Header() {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const t = useTranslations('Header');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };  

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef]);

    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">Daisu</Link>
                <ul className="flex space-x-2 items-center justify-center">
                    <li>
                        <Link href="/" className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                            <Home size={24} />
                            <span className="sr-only">{t('home')}</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/languages" className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                            <Globe size={24} />
                            <span className="sr-only">{t('languages')}</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/chat" className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
                            <MessageCircle size={24} />
                            <span className="sr-only">{t('chat')}</span>
                        </Link>
                    </li>
                </ul>
                {session?.user ? (
                    <div className="flex items-center space-x-4">
                        <div className="relative" ref={menuRef}>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-600 hidden md:inline">{session.user.name}</span>
                                <Image 
                                    src={session.user.image || '/default-profile.png'} 
                                    alt={session.user.name || 'User'} 
                                    width={40} 
                                    height={40} 
                                    className="rounded-full hover:opacity-80 cursor-pointer border-2 border-blue-500" 
                                    onClick={() => setMenuOpen(!menuOpen)}
                                />
                            </div>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
                                    {session.user.isAdmin && (
                                        <Link href="/dashboard" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg">
                                            <Home size={18} className="mr-2" />
                                            {t('dashboard')}
                                        </Link>
                                    )}
                                    <Link href="/profile" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                                        <User size={18} className="mr-2" />
                                        {t('profile')}
                                    </Link>
                                    <button onClick={ async () => { await signOut({callbackUrl:"/"})}} className="flex items-center w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-b-lg">
                                        <LogOut size={18} className="mr-2" />
                                        {t('signOut')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Button onClick={() => signIn()} className="bg-blue-500 text-white hover:bg-blue-600">
                        {t('signIn')}
                    </Button>
                )}
            </div>
        </nav>
    );
}