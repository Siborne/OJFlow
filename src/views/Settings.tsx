import { useState, useCallback } from 'react';
import { ChevronRight, RefreshCw, Info, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useContestStore } from '@/stores/contest';
import { useUiStore } from '@/stores/ui';
import { ContestService } from '@/services/contest';
import { t } from '@/i18n';
import { checkUpdate, getUpdateDialogSpec } from '@/updater/checkUpdate';
import { Button } from '@/components/ui/button';

const rawVersion = (import.meta as unknown as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION;
const curVersion = rawVersion ? (rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`) : 'v0.0.0';

export default function Settings() {
  const store = useContestStore();
  const uiStore = useUiStore();
  const [maxDays, setMaxDays] = useState(store.day);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdatingDays, setIsUpdatingDays] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const updateMaxDays = useCallback(async (value: number) => {
    if (isUpdatingDays) return;
    setIsUpdatingDays(true);
    try {
      await store.setMaxCrawlDays(value);
      setMaxDays(store.day);
      showMessage('success', `${t('settings.retentionPeriod')}已更新为 ${store.day} 天`);
    } catch (e: unknown) {
      setMaxDays(store.day);
      const msg = e instanceof Error ? e.message : '更新失败';
      showMessage('error', `更新失败：${msg}`);
    } finally {
      setIsUpdatingDays(false);
    }
  }, [store, isUpdatingDays, showMessage]);

  const checkForUpdate = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const info = await checkUpdate();
      const spec = getUpdateDialogSpec(info);
      if (spec.kind === 'update') {
        showMessage('success', `发现新版本: ${spec.title}`);
      } else if (spec.kind === 'error') {
        showMessage('error', spec.content);
      } else {
        showMessage('success', '无更新');
      }
    } catch {
      showMessage('error', '检查失败');
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, showMessage]);

  const openUrl = (url: string) => ContestService.openUrl(url);

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title="设置中心" />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Toast message */}
        {message && (
          <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            message.type === 'success' ? 'bg-[var(--color-success)]' : message.type === 'error' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'
          }`}>
            {message.text}
          </div>
        )}

        {/* Summary grid */}
        <div className="mb-4 grid grid-cols-[8fr_2fr_2fr] gap-3 max-md:grid-cols-1">
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_52%,transparent_82%)]" />
            <div className="relative z-10">
              <div className="mb-1 text-sm font-medium text-[var(--color-text-soft)]">系统状态</div>
              <div className="text-3xl font-bold leading-tight text-[var(--color-primary)]">{curVersion}</div>
              <div className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">
                当前保留天数 {maxDays} · 更新状态 {isChecking ? '检查中' : '就绪'}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_52%,transparent_82%)]" />
            <div className="relative z-10">
              <div className="mb-1 text-sm font-medium text-[var(--color-text-soft)]">保留天数</div>
              <div className="text-2xl font-[680] text-[var(--color-text-soft)]">{maxDays}</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_52%,transparent_82%)]" />
            <div className="relative z-10">
              <div className="mb-1 text-sm font-medium text-[var(--color-text-soft)]">主题模式</div>
              <div className="text-2xl font-[680] text-[var(--color-text-soft)]">{uiStore.colorMode}</div>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
          {/* Retention days */}
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 transition-colors hover:bg-[rgba(14,165,233,0.06)]">
            <div className="flex h-6 w-6 items-center justify-center rounded-[10px] text-[var(--settings-icon-default)] transition-colors hover:bg-[rgba(14,165,233,0.1)] hover:text-[var(--color-primary)]">
              <RefreshCw size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[var(--color-text)]">{t('settings.retentionPeriod')}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{t('settings.retentionPeriodDesc')}</div>
            </div>
            <div className="flex items-center gap-2">
              {isUpdatingDays && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />}
              <input
                type="number"
                min={1}
                max={30}
                value={maxDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxDays(v);
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= 30 && v !== store.day) updateMaxDays(v);
                }}
                className="w-[70px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Check update */}
          <div
            role="button"
            tabIndex={0}
            onClick={checkForUpdate}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); checkForUpdate(); } }}
            className="group flex cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 transition-colors hover:bg-[rgba(14,165,233,0.06)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[10px] text-[var(--settings-icon-default)] transition-colors group-hover:bg-[rgba(14,165,233,0.1)] group-hover:text-[var(--color-primary)]">
              <RefreshCw size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[var(--color-text)]">检查更新</div>
              <div className="text-xs text-[var(--color-text-muted)]">当前版本: {curVersion}</div>
            </div>
            <div className="flex items-center gap-2">
              {isChecking && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />}
              <ChevronRight size={18} className="text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* About */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => openUrl('https://github.com/Siborne/OJFlow')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUrl('https://github.com/Siborne/OJFlow'); } }}
            className="group flex cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 transition-colors hover:bg-[rgba(14,165,233,0.06)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[10px] text-[var(--settings-icon-default)] transition-colors group-hover:bg-[rgba(14,165,233,0.1)] group-hover:text-[var(--color-primary)]">
              <Info size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[var(--color-text)]">关于 OJ Flow</div>
              <div className="text-xs text-[var(--color-text-muted)]">开源地址: https://github.com/Siborne/OJFlow</div>
            </div>
            <ChevronRight size={18} className="text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </div>

          {/* Friend link */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => openUrl('https://github.com/2754LM/oj_helper')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUrl('https://github.com/2754LM/oj_helper'); } }}
            className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[rgba(14,165,233,0.06)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[10px] text-[var(--settings-icon-default)] transition-colors group-hover:bg-[rgba(14,165,233,0.1)] group-hover:text-[var(--color-primary)]">
              <Link2 size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[var(--color-text)]">友链 OJ Helper</div>
              <div className="text-xs text-[var(--color-text-muted)]">开源地址: https://github.com/2754LM/oj_helper</div>
            </div>
            <ChevronRight size={18} className="text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
