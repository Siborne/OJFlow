import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ContestService } from '@/services/contest';
import { Button } from '@/components/ui/button';

export default function CcpPage() {
  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title="CCPC 获奖查询" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="mb-2 text-5xl">🏆</div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--color-text)]">CCPC Finder</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            查询 CCPC/ICPC 竞赛获奖记录、队伍排名及参赛详情
          </p>
        </div>
        <Button
          onClick={() => ContestService.openUrl('https://cpcfinder.com/')}
          className="gap-2"
        >
          <ExternalLink size={16} />
          在浏览器中打开 CPCFinder
        </Button>
        <p className="text-xs text-[var(--color-text-muted)]">
          数据来源: cpcfinder.com
        </p>
      </div>
    </div>
  );
}
