'use client';

import { useStore } from '@/store';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun, Monitor, Save, RefreshCw, Languages } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const { setTheme, theme } = useTheme();
  const t = useTranslations('Settings');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setSettings({ ...settings, theme: newTheme });
  };

  const handleLanguageChange = (newLang: 'en' | 'zh') => {
    setSettings({ ...settings, language: newLang });
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>

      {/* Language Section */}
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">{t('language')}</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleLanguageChange('zh')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-24 ${
              settings.language === 'zh'
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            }`}
          >
            <Languages className="w-6 h-6" />
            <span className="text-sm font-medium">中文</span>
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-24 ${
              settings.language === 'en'
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            }`}
          >
            <Languages className="w-6 h-6" />
            <span className="text-sm font-medium">English</span>
          </button>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">{t('appearance')}</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-24 ${
              theme === 'light'
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            }`}
          >
            <Sun className="w-6 h-6" />
            <span className="text-sm font-medium">{t('light')}</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-24 ${
              theme === 'dark'
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            }`}
          >
            <Moon className="w-6 h-6" />
            <span className="text-sm font-medium">{t('dark')}</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-24 ${
              theme === 'system'
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary'
                : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
            }`}
          >
            <Monitor className="w-6 h-6" />
            <span className="text-sm font-medium">{t('system')}</span>
          </button>
        </div>
      </section>

      {/* Sync Settings */}
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">{t('dataSync')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{t('autoSync')}</p>
                <p className="text-sm text-muted-foreground">{t('autoSyncDesc')}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_sync}
                onChange={(e) => setSettings({ ...settings, auto_sync: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-primary"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">{t('syncInterval')}</span>
            <input
              type="number"
              value={settings.sync_interval}
              onChange={(e) => setSettings({ ...settings, sync_interval: Number(e.target.value) })}
              className="w-20 px-3 py-1 bg-muted border border-border rounded-md text-sm text-foreground"
              min="15"
            />
          </div>
        </div>
      </section>

      {/* Accounts Section Placeholder */}
      <section className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">{t('linkedAccounts')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('linkedAccountsDesc')}</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="w-4 h-4" />
          {t('connectAccount')}
        </button>
      </section>
    </div>
  );
}
