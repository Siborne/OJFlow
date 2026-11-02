import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ContestService } from '@/services/contest';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

export default function OierPage() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('oier.title')} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="mb-2 text-5xl">🎓</div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--color-text)]">OIer Database</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{t('oier.desc')}</p>
        </div>
        <Button
          onClick={() => ContestService.openUrl('https://oier.baoshuo.dev/')}
          className="gap-2"
        >
          <ExternalLink size={16} />
          {t('oier.open')}
        </Button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('external.source', { source: 'oier.baoshuo.dev' })}
        </p>
      </div>
    </div>
  );
}
