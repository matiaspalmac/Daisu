import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="bg-orange-100 text-gray-600">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('aboutTitle')}</h3>
            <p>{t('aboutDescription')}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('quickLinksTitle')}</h3>
            <ul className="space-y-2">
              <li><Link href="/l  anguages" className="hover:text-orange-600">{t('exploreLanguages')}</Link></li>
              <li><Link href="/chat" className="hover:text-orange-600">{t('liveChat')}</Link></li>
              <li><Link href="/profile" className="hover:text-orange-600">{t('myProfile')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('contactTitle')}</h3>
            <p>{t('email')}</p>
            <p>{t('phone')}</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p>&copy; 2024 Daisu. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}