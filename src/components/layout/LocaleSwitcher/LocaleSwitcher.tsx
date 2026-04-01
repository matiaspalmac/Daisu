"use client";

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LocaleCode = 'es' | 'en' | 'br';

const locales: { code: LocaleCode; name: string; flag: string; tag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸', tag: 'ES' },
  { code: 'en', name: 'English', flag: '🇬🇧', tag: 'EN' },
  { code: 'br', name: 'Português', flag: '🇧🇷', tag: 'PT' },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const current = locales.find(l => l.code === locale) || locales[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150"
          style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface3)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
        >
          <Globe size={14} />
          <span className="hidden sm:inline">{current.flag} {current.name}</span>
          <span className="sm:hidden font-bold text-xs">{current.flag}</span>
          <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl p-1 min-w-[140px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px var(--shadow)' }}>
        {locales.map((l) => (
          <DropdownMenuItem key={l.code} asChild className="rounded-lg cursor-pointer">
            <Link href={pathname} locale={l.code}
              className="flex items-center gap-2.5 px-3 py-2 text-sm"
              style={{ color: l.code === locale ? 'var(--primary)' : 'var(--text)', fontWeight: l.code === locale ? 600 : 400 }}>
              <span className="text-base">{l.flag}</span>
              <span>{l.name}</span>
              {l.code === locale && <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--primary)' }}>✓</span>}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}