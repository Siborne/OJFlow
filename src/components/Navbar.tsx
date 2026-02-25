'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

export const Navbar = () => {
  const pathname = usePathname();
  const t = useTranslations('Navbar');

  const navItems = [
    { name: t('contests'), href: '/', icon: Home },
    { name: t('statistics'), href: '/statistics', icon: BarChart2 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-card border-t border-border md:relative md:w-64 md:h-screen md:border-r md:border-t-0 flex md:flex-col justify-between z-50 transition-colors duration-300">
      <div className="flex-1 md:py-6">
        <div className="hidden md:flex items-center gap-2 px-6 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
            OJ
          </div>
          <span className="text-xl font-bold text-foreground">OJFlow</span>
        </div>
        
        <div className="flex md:flex-col justify-around md:justify-start w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col md:flex-row items-center md:gap-3 p-3 md:px-6 md:py-3 transition-colors',
                  isActive 
                    ? 'text-primary md:bg-blue-50 dark:md:bg-blue-900/20 md:border-r-4 md:border-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
