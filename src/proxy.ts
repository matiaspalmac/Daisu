import { withAuth } from 'next-auth/middleware';
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const publicPages = [
  '/', '/languages', '/languages/es', '/languages/en', '/languages/pt',
  '/chat', '/acknowledgments', '/login', '/register',
  '/news', '/membership', '/about', '/contact', '/privacy', '/terms',
  '/resources', '/resources/textbooks', '/resources/videos', '/resources/articles', '/resources/links',
  '/checkout',
];

const handleI18nRouting = createMiddleware(routing);

const locales = routing.locales;

const authMiddleware = withAuth(
  function onSuccess(req) {
    return handleI18nRouting(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => token != null
    }
  });

export default function middleware(req: NextRequest) {
  const publicPathnameRegex = RegExp(
    `^(/(${locales.join('|')}))?(${publicPages
      .flatMap((p) => (p === '/' ? ['', '/'] : p))
      .join('|')})/?$`,
    'i'
  );

  const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

  if (isPublicPage) {
    return handleI18nRouting(req);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (authMiddleware as any)(req);
  }
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};