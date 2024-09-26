"use client";
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

export default function Header() {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold text-orange-600 hover:text-orange-700">Daisu</Link>
                <ul className="flex space-x-4 items-center justify-center">
                    <li><Link href="/" className="text-gray-600 hover:text-orange-600">Inicio</Link></li>
                    <li><Link href="/languages" className="text-gray-600 hover:text-orange-600">Idiomas</Link></li>
                    <li><Link href="/chat" className="text-gray-600 hover:text-orange-600">Chat</Link></li>
                </ul>
                {session?.user ? (
                    <div className="flex items-center space-x-4">
                        <div className="relative" ref={menuRef}>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-600">{session.user.name}</span>
                                <Image 
                                    src={session.user.image || '/default-profile.png'} 
                                    alt={session.user.name || 'User'} 
                                    width={32} 
                                    height={32} 
                                    className="rounded-full hover:opacity-80 cursor-pointer" 
                                    onClick={() => setMenuOpen(!menuOpen)}
                                />
                            </div>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-40">
                                    <Link href="/dashboard" className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Panel de control</Link>
                                    <Link href="/profile" className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Perfil</Link>
                                    <button onClick={ async () => { await signOut({callbackUrl:"/"})}} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Cerrar sesión</button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <button onClick={() => signIn()} className="bg-orange-500 text-white hover:bg-orange-600 py-2 px-4 rounded">Iniciar sesión</button>
                )}
            </div>
        </nav>
    );
}