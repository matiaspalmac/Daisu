'use client';

import { useTranslations } from 'next-intl';
import { Mail, Sparkles, Crown, Palette, Code2 } from "lucide-react";
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function AcknowledgmentsPage() {
  const t = useTranslations('Acknowledgments');

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
            <Sparkles size={14} /> {t('badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--text)' }}>
            {t('title')}
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--text2)' }}>
            {t('description')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, var(--primary-light), transparent)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ border: '2px solid var(--border)' }}>
                <Image
                  src="/matiaspalma.jpeg"
                  alt="Matias Palma"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>Matias</h2>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--primary)' }}>
                  {t('mainRole')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-5">
              {[
                { key: 'creator', icon: Crown },
                { key: 'founderDeveloper', icon: Code2 },
                { key: 'designer', icon: Palette },
              ].map((role) => (
                <div
                  key={role.key}
                  className="rounded-full px-3.5 py-2 flex items-center gap-2 text-xs font-semibold"
                  style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
                    <role.icon size={12} style={{ color: 'var(--primary)' }} />
                  </span>
                  <span>{t(`roles.${role.key}` as any)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text2)' }}>
              {t('messageToCommunity')}
            </p>
            <p className="mt-4 text-sm font-bold" style={{ color: 'var(--text)' }}>
              {t('signature')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}