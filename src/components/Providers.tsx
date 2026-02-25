'use client';

import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import enMessages from '@/messages/en.json';
import zhMessages from '@/messages/zh.json';

export function Providers({ children }: { children: React.ReactNode }) {
  const { settings } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const messages = settings.language === 'en' ? enMessages : zhMessages;
  const locale = settings.language || 'zh';

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
