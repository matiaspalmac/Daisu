import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import {NextIntlClientProvider} from 'next-intl';

import Header from "@/components/header";
import Footer from "@/components/footer";
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
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {

  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}