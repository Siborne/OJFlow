import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OJFlow',
  description: 'Online Judge Helper',
};

import { Providers } from '@/components/Providers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col md:flex-row min-h-screen bg-zinc-50 dark:bg-zinc-950`}>
        <Providers>
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
