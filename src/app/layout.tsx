import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LocalKart - Discover & Compare Nearby Local Stores',
  description: 'Search products, compare prices at nearest physical retail stores, check stock availability, and navigate directly using Google Maps.',
  keywords: 'local shopping, hyper-local commerce, blinkit for shops, nearby store comparison, local price tracker, buy local',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-screen pb-16 md:pb-0 relative`}
      >
        <Suspense fallback={<div className="h-16 sm:h-24 bg-white border-b border-gray-100" />}>
          <Header />
        </Suspense>
        <main className="flex-grow max-w-7xl w-full mx-auto px-3 py-4 sm:px-5 lg:px-6 lg:py-5 animate-slide-up">
          {children}
        </main>
        <BottomNav />
        
      </body>
    </html>
  );
}
