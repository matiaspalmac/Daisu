import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import AppShell from "@/components/layout/AppShell";
import { getMessages } from "next-intl/server";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Daisu",
  description: "Intercambia idiomas con hablantes nativos",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {

  const { locale } = await params;

  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <AppShell>{children}</AppShell>
            </Providers>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}