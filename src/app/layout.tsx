'use client';

import { Inter, Roboto_Mono } from "next/font/google";
import Navbar from "@/src/app/components/Navbar";
import "./globals.css";
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { UserProvider } from '@auth0/nextjs-auth0/client';

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <UserProvider>
        <body
          className={`${inter.variable} ${robotoMono.variable} antialiased`}
        >
          <I18nextProvider i18n={i18n}>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </I18nextProvider>
        </body>
      </UserProvider>
    </html>
  );
}
