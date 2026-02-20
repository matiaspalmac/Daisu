'use client';

import { useTranslations } from 'next-intl';
import { Heart, MapPin, Code, Globe } from "lucide-react";
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Collaborator {
  name: string;
  role: string;
  image: string;
  location: string;
  icon: typeof Code;
}

export default function AcknowledgmentsPage() {
  const t = useTranslations('Acknowledgments');

  const collaborators: Collaborator[] = [
    { name: "Matias Palma", role: "Frontend & Backend Developer", image: "https://i.imgur.com/MrqsFQL.png", location: "Chile", icon: Code },
    { name: "Blanca Duran", role: "Traductora Inglés y Portugués", image: "https://i.imgur.com/MrqsFQL.png", location: "Chile", icon: Globe },
  ];

  return (
    <div className="min-h-screen py-14 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
              <Heart size={28} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text)' }}>{t('title')}</h1>
          <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text2)' }}>
            {t('description')}
          </p>
        </motion.div>

        {/* Collaborators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {collaborators.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-2xl transition-all duration-200"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px var(--shadow)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-shrink-0">
                  <Image
                    src={c.image}
                    alt={c.name}
                    width={56}
                    height={56}
                    className="rounded-full"
                    style={{ border: '2px solid var(--border)' }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)', border: '2px solid var(--surface)' }}>
                    <c.icon size={10} className="text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text)' }}>{c.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--primary)' }}>{c.role}</p>
                </div>
                <Heart size={16} className="ml-auto text-red-400 flex-shrink-0" />
              </div>

              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text2)' }}>
                {t('thankYouMessage', { name: c.name })}
              </p>

              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
                <MapPin size={12} />
                <span>{c.location}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Final message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center p-8 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>{t('finalMessage')}</p>
          <Heart className="mx-auto text-red-400 animate-pulse" size={40} />
        </motion.div>
      </div>
    </div>
  );
}