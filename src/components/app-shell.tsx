"use client";

import { usePathname } from '@/i18n/routing';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = /\/chat\/?$/.test(pathname || '');

  return (
    <>
      <Header />
      <main
        style={
          isChatRoute
            ? { height: 'calc(100vh - var(--nav-h))', overflow: 'hidden' }
            : { minHeight: 'calc(100vh - var(--nav-h))' }
        }
      >
        {children}
      </main>
      {!isChatRoute && <Footer />}
    </>
  );
}
