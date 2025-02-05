'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Navbar from "@/components/Navbar";
import "./globals.css";
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const isPreviewEnvironment = () => {
  return process.env.NEXT_PUBLIC_AZURE_STATIC_WEBAPPS_ENVIRONMENT === 'preview' || !process.env.NEXT_PUBLIC_AUTH0_BASE_URL;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nextProvider i18n={i18n}>
          <UserProvider
            loginUrl="/mock-login"
            profileUrl="/api/auth/userinfo"
          >
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </UserProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
