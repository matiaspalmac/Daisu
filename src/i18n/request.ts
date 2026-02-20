import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  let locale = (await requestLocale) as string | undefined;
  if (!locale) locale = routing.defaultLocale;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default
  };
});