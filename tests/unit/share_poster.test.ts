import { describe, expect, test } from 'bun:test';
import {
  buildSharePosterSvg,
  createSharePosterDataUrl,
  type SharePosterData,
} from '../../src/utils/share-poster';

const data: SharePosterData = {
  locale: 'zh-CN',
  handle: 'tourist & friend',
  platform: 'Codeforces',
  rating: 2400,
  maxRating: 2600,
  tier: 'Grandmaster',
  ratingColor: '#dc2626',
  totalSolved: 1395,
  solved: [
    { label: '洛谷', value: 476, color: '#22c55e' },
    { label: 'Codeforces', value: 277, color: '#3b82f6' },
  ],
  topics: [
    { label: '动态规划', value: 19, color: '#2dd4bf' },
    { label: '构造', value: 17, color: '#2dd4bf' },
  ],
  completedSchedule: 3,
  generatedAt: new Date('2026-11-03T12:00:00Z').getTime(),
};

describe('share poster', () => {
  test('builds a data-driven SVG with escaped user content', () => {
    const svg = buildSharePosterSvg(data);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="1500"');
    expect(svg).toContain('tourist &amp; friend');
    expect(svg).toContain('1,395');
    expect(svg).toContain('动态规划');
    expect(svg).toContain('#dc2626');
    expect(svg).toContain('siborne.top/OJFlow');
  });

  test('wraps the poster as an image data URL', () => {
    const url = createSharePosterDataUrl(data, 'paper');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url.split(',')[1])).toContain('我的算法竞赛训练快照');
    expect(decodeURIComponent(url.split(',')[1])).toContain('#f7f1e6');
  });

  test('moves the topic section below all platform rows', () => {
    const svg = buildSharePosterSvg({
      ...data,
      solved: Array.from({ length: 5 }, (_, index) => ({
        label: `Platform ${index}`,
        value: 100 - index,
        color: '#2dd4bf',
      })),
    });
    expect(svg).toContain('y="1206" fill="#f7fbfd" font-size="34" font-weight="720">训练主题');
  });

  test('respects enabled poster sections', () => {
    const svg = buildSharePosterSvg(data, 'aurora', {
      showRating: false,
      showPlatforms: false,
      showTopics: true,
      showSchedule: false,
    });
    expect(svg).not.toContain('当前 Rating');
    expect(svg).not.toContain('平台分布');
    expect(svg).toContain('训练主题');
    expect(svg).not.toContain('已完成日程');
  });
});
