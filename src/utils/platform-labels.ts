import type { AppLocale } from '../../shared/types';

const PLATFORM_LABELS: Record<string, { zh: string; en: string }> = {
  Codeforces: { zh: 'Codeforces', en: 'Codeforces' },
  AtCoder: { zh: 'AtCoder', en: 'AtCoder' },
  洛谷: { zh: '洛谷', en: 'Luogu' },
  蓝桥云课: { zh: '蓝桥云课', en: 'Lanqiao' },
  力扣: { zh: '力扣', en: 'LeetCode' },
  牛客: { zh: '牛客', en: 'Nowcoder' },
  VJudge: { zh: 'VJudge', en: 'VJudge' },
  HDU: { zh: 'HDU', en: 'HDU' },
  POJ: { zh: 'POJ', en: 'POJ' },
  QOJ: { zh: 'QOJ', en: 'QOJ' },
  Other: { zh: '其他', en: 'Other' },
  其他: { zh: '其他', en: 'Other' },
};

export function getPlatformLabel(platform: string, locale: AppLocale): string {
  return PLATFORM_LABELS[platform]?.[locale === 'zh-CN' ? 'zh' : 'en'] ?? platform;
}
