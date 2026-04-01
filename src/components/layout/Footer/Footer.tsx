'use client'

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Globe, BookOpen, MessageCircle, Heart, Twitter, Instagram, Github } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('Footer');
  const tc = useTranslations('Common');

  return (
    <footer className="border-t mt-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-8">

          <div>
            <Link href="/" className="text-xl font-bold block mb-3" style={{ color: 'var(--primary)' }}>
              Daisu
            </Link>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text2)' }}>
              {t('description') || 'Conectando el mundo a través del intercambio de idiomas y culturas.'}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mb-5">
              {(['es', 'en', 'pt'] as const).map(code => (
                <span
                  key={code}
                  className="text-[11px] px-2 py-1 rounded-full font-semibold"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                >
                  {tc(`languages.${code}` as any)}
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Github, label: 'GitHub' },
              ].map(({ icon: Icon, label }) => (
                <a key={label} href="#" aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)'; }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>{t('explore') || 'Explorar'}</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/languages', icon: Globe, label: t('languages') || 'Idiomas' },
                { href: '/resources', icon: BookOpen, label: t('resources') || 'Recursos' },
                { href: '/chat', icon: MessageCircle, label: t('chat') || 'Chat' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm flex items-center gap-2 transition-colors duration-150"
                    style={{ color: 'var(--text2)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text2)'}
                  >
                    <item.icon size={13} /> {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>{t('company') || 'Compañía'}</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/about', label: t('about') || 'Sobre Nosotros' },
                { href: '/contact', label: t('contact') || 'Contacto' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm transition-colors duration-150"
                    style={{ color: 'var(--text2)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text2)'}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>{t('legal') || 'Legal'}</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/privacy', label: t('privacyPolicy') || 'Privacidad' },
                { href: '/terms', label: t('termsOfService') || 'Términos' },
                { href: '/acknowledgments', label: t('acknowledgments') || 'Agradecimientos' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm transition-colors duration-150"
                    style={{ color: 'var(--text2)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--primary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text2)'}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            &copy; {new Date().getFullYear()} Daisu. {t('allRightsReserved') || 'Todos los derechos reservados.'}
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text3)' }}>
            <span>{t('madeWith') || 'Made with'}</span>
            <Heart size={12} className="text-red-400" />
            <span>{t('inChile') || 'in Chile'} · Daisu</span>
          </div>
        </div>
      </div>
    </footer>
  );
}