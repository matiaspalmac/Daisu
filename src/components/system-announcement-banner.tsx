'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Announcement {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  info:    { bg: '#2d88ff12', border: '#2d88ff40', text: '#2d88ff' },
  warning: { bg: '#f59e0b12', border: '#f59e0b40', text: '#f59e0b' },
  error:   { bg: '#ef444412', border: '#ef444440', text: '#ef4444' },
  success: { bg: '#10b98112', border: '#10b98140', text: '#10b981' },
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export default function SystemAnnouncementBanner() {
  const t = useTranslations('SystemAnnouncement');
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/system-announcement`);
        if (res.ok) {
          const data = await res.json();
          if (data?.message) {
            setAnnouncement(data);
            setDismissed(false);
          }
        }
      } catch { /* silently ignore */ }
    };

    fetchAnnouncement();
    // Re-check every 5 minutes
    const interval = setInterval(fetchAnnouncement, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!announcement?.message || dismissed) return null;

  const styles = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm border-b"
      style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}
      role="alert"
    >
      <span className="flex-1 text-center font-medium">{announcement.message}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t('dismiss')}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
}
