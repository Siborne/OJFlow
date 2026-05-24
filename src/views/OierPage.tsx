import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ContestService } from '@/services/contest';
import { Button } from '@/components/ui/button';

export default function OierPage() {
  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title="OIer 排名查询" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="mb-2 text-5xl">🎓</div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--color-text)]">OIer Database</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            查询全国信息学奥林匹克竞赛选手排名及获奖数据
          </p>
        </div>
        <Button
          onClick={() => ContestService.openUrl('https://oier.baoshuo.dev/')}
          className="gap-2"
        >
          <ExternalLink size={16} />
          在浏览器中打开 OIerDB
        </Button>
        <p className="text-xs text-[var(--color-text-muted)]">
          数据来源: oier.baoshuo.dev
        </p>
      </div>
    </div>
  );
}
