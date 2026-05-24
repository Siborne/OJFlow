import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Star, LayoutList, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const MENU_ITEMS: NavItem[] = [
  { key: 'contest', label: '比赛', icon: Calendar, path: '/contest' },
  { key: 'star', label: '收藏', icon: Star, path: '/star' },
  { key: 'service', label: '功能', icon: LayoutList, path: '/service' },
  { key: 'setting', label: '设置', icon: Settings, path: '/setting' },
];

export default function NavigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isWide, setIsWide] = useState(window.innerWidth > 768);

  const activeKey =
    MENU_ITEMS.find((item) => item.path === location.pathname)?.key ?? 'contest';

  useKeyboardShortcuts();

  useEffect(() => {
    const checkLayout = () => setIsWide(window.innerWidth > 768);
    window.addEventListener('resize', checkLayout);
    checkLayout();

    if (location.pathname === '/') {
      navigate('/contest', { replace: true });
    }

    return () => window.removeEventListener('resize', checkLayout);
  }, [location.pathname, navigate]);

  const handleNav = (path: string) => {
    navigate(path);
  };

  if (isWide) {
    return (
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav
          className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center gap-1 border-r border-[var(--color-border)] bg-[var(--nav-bg-color)] pt-3 backdrop-blur-[var(--frost-blur)]"
          role="navigation"
          aria-label="主导航"
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'relative flex h-12 w-12 flex-col items-center justify-center rounded-xl transition-all duration-[var(--motion-base)]',
                  isActive
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-color)]'
                    : 'text-[var(--nav-text-color)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-color)]',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-primary)]" />
                )}
                <Icon size={22} />
                <span className="mt-0.5 text-[11px] leading-tight tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="ml-16 min-h-screen flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Mobile content */}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--nav-bg-color)] backdrop-blur-[calc(var(--frost-blur)+2px)] shadow-[0_-8px_20px_rgba(15,23,42,0.08)]"
        style={{ height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="navigation"
        aria-label="主导航"
      >
        <div className="flex h-[var(--nav-height)] items-center justify-around gap-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'relative flex min-w-[62px] flex-col items-center rounded-xl px-2.5 py-1.5 transition-all duration-[var(--motion-base)]',
                  isActive
                    ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-color)] shadow-[inset_0_0_0_1px_rgba(255,161,22,0.16)]'
                    : 'text-[var(--nav-text-color)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-color)] hover:-translate-y-px',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <div className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-b bg-[var(--color-primary)]" />
                )}
                <Icon size={22} />
                <span className="mt-0.5 text-[11px] leading-tight tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
