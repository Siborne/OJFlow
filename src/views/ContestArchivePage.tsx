import { ExternalLink, GraduationCap, ShieldCheck, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ContestService } from '@/services/contest';
import { useI18n, type MessageKey } from '@/i18n';

interface ArchiveResource {
  id: string;
  icon: React.ElementType;
  titleKey: MessageKey;
  descKey: MessageKey;
  actionKey: MessageKey;
  source: string;
  url: string;
  tags: MessageKey[];
  accent: string;
  iconBg: string;
}

const RESOURCES: ArchiveResource[] = [
  {
    id: 'ccpc',
    icon: Trophy,
    titleKey: 'archive.ccpcTitle',
    descKey: 'archive.ccpcDesc',
    actionKey: 'archive.openCcpc',
    source: 'cpcfinder.com',
    url: 'https://cpcfinder.com/',
    tags: ['archive.ccpcTagAwards', 'archive.ccpcTagTeams', 'archive.ccpcTagDetails'],
    accent: '#d97706',
    iconBg: 'linear-gradient(135deg, #fff7dc 0%, #fde68a 100%)',
  },
  {
    id: 'oier',
    icon: GraduationCap,
    titleKey: 'archive.oierTitle',
    descKey: 'archive.oierDesc',
    actionKey: 'archive.openOier',
    source: 'oier.baoshuo.dev',
    url: 'https://oier.baoshuo.dev/',
    tags: ['archive.oierTagRanking', 'archive.oierTagAwards', 'archive.oierTagProfile'],
    accent: '#db2777',
    iconBg: 'linear-gradient(135deg, #fff1f7 0%, #f9a8d4 100%)',
  },
];

export default function ContestArchivePage() {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('archive.title')} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl">
          <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-primary-weak),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(255,161,22,0.14),transparent_48%)]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                <ShieldCheck size={13} />
                {t('archive.eyebrow')}
              </span>
              <h3 className="mt-4 max-w-3xl text-3xl font-[760] tracking-[-0.04em] text-[var(--color-text)]">
                {t('archive.heading')}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
                {t('archive.desc')}
              </p>
            </div>
          </section>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {RESOURCES.map(resource => {
              const Icon = resource.icon;
              return (
                <article
                  key={resource.id}
                  data-testid={`archive-${resource.id}`}
                  className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--card-shadow-hover)]"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: resource.accent }}
                  />
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-[18px] shadow-[var(--clay-inset)]"
                    style={{ background: resource.iconBg, color: resource.accent }}
                  >
                    <Icon size={29} />
                  </div>
                  <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {t('archive.independentSource')}
                  </div>
                  <h4 className="mt-1 text-xl font-[720] tracking-[-0.025em] text-[var(--color-text)]">
                    {t(resource.titleKey)}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    {t(resource.descKey)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {resource.tags.map(tag => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)]"
                      >
                        {t(tag)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {t('external.source', { source: resource.source })}
                    </span>
                    <Button
                      className="gap-2"
                      onClick={() => void ContestService.openUrl(resource.url)}
                    >
                      <ExternalLink size={16} />
                      {t(resource.actionKey)}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-4 py-3 text-xs leading-5 text-[var(--color-text-muted)]">
            {t('archive.externalNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
