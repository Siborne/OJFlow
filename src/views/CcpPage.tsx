import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ContestService } from '@/services/contest';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

export default function CcpPage() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('ccp.title')} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="mb-2 text-5xl">🏆</div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--color-text)]">CCPC Finder</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{t('ccp.desc')}</p>
        </div>
        <Button onClick={() => ContestService.openUrl('https://cpcfinder.com/')} className="gap-2">
          <ExternalLink size={16} />
          {t('ccp.open')}
        </Button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('external.source', { source: 'cpcfinder.com' })}
        </p>
      </div>
    </div>
  );
}
