'use client';

import { ArrowLeft, PieChart, Search } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/StatCard';

const PLATFORMS = [
  { id: 'codeforces', name: 'Codeforces', label: '用户名' },
  { id: 'atcoder', name: 'AtCoder', label: '用户名' },
  { id: 'leetcode', name: '力扣', label: '用户名' },
  { id: 'luogu', name: '洛谷', label: '用户名' },
  { id: 'nowcoder', name: '牛客', label: 'id' },
  { id: 'vjudge', name: 'VJudge', label: '用户名' },
  { id: 'hdu', name: 'hdu', label: '用户名' },
  { id: 'poj', name: 'poj', label: '用户名' },
  { id: 'lanqiao', name: '蓝桥云课', label: 'id' },
];

export default function StatisticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">题数统计</h1>
        </div>
        <div className="flex items-center gap-4 text-blue-500">
          <PieChart className="w-6 h-6 cursor-pointer hover:opacity-80" />
          <Search className="w-6 h-6 cursor-pointer hover:opacity-80" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => (
          <StatCard 
            key={platform.id}
            platformId={platform.id}
            name={platform.name}
            label={platform.label}
          />
        ))}
      </div>
    </div>
  );
}
