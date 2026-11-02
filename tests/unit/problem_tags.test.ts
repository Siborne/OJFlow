import { describe, expect, test } from 'bun:test';
import { PROBLEM_TAGS, getProblemTagLabel, normalizeProblemTag } from '../../shared/problem-tags';

describe('problem tag dictionary', () => {
  test('contains a broad bilingual topic catalog', () => {
    expect(PROBLEM_TAGS.length).toBeGreaterThanOrEqual(65);
    expect(PROBLEM_TAGS.some(tag => tag.id === 'dp' && tag.zh === '动态规划')).toBe(true);
    expect(PROBLEM_TAGS.some(tag => tag.id === 'segment tree' && tag.en === 'Segment Tree')).toBe(
      true,
    );
  });

  test('normalizes Chinese, English and alias values to stable API ids', () => {
    expect(normalizeProblemTag('动态规划')).toBe('dp');
    expect(normalizeProblemTag('Dynamic Programming')).toBe('dp');
    expect(normalizeProblemTag('Array')).toBe('arrays');
    expect(normalizeProblemTag('BFS')).toBe('breadth-first search');
    expect(normalizeProblemTag('Unknown Topic')).toBe('unknown topic');
  });

  test('renders labels in the selected locale', () => {
    expect(getProblemTagLabel('dp', 'zh-CN')).toBe('动态规划');
    expect(getProblemTagLabel('dp', 'en-US')).toBe('Dynamic Programming');
    expect(getProblemTagLabel('arrays', 'zh-CN')).toBe('数组');
    expect(getProblemTagLabel('custom-tag', 'en-US')).toBe('custom-tag');
  });
});
