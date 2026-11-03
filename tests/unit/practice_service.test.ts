import { beforeEach, describe, expect, mock, test } from 'bun:test';

class FakeElectronStore {
  private data: Record<string, unknown>;

  constructor(options: { defaults?: Record<string, unknown> }) {
    this.data = structuredClone(options.defaults ?? {});
  }

  get(key: string): unknown {
    let value: unknown = this.data;
    for (const part of key.split('.')) {
      if (!value || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return structuredClone(value);
  }

  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let current = this.data;
    for (const part of parts.slice(0, -1)) {
      if (!current[part] || typeof current[part] !== 'object') current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = structuredClone(value);
  }
}

mock.module('electron-store', () => ({ default: FakeElectronStore }));

const practice = await import('../../electron/services/practice-service');

const payload = {
  name: 'A. Watermelon',
  group: 'Codeforces Round 1',
  url: 'https://codeforces.com/contest/4/problem/A',
  tests: [{ input: '8\n', output: 'YES\n' }],
  timeLimit: 1000,
  memoryLimit: 256,
};

describe('practice service', () => {
  beforeEach(() => {
    practice.clearPracticeProblems();
  });

  test('normalizes Competitive Companion payloads', () => {
    expect(practice.normalizeCompanionProblem(payload)).toMatchObject({
      name: 'A. Watermelon',
      group: 'Codeforces Round 1',
      source: 'Codeforces',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      samples: [{ input: '8\n', output: 'YES\n' }],
    });
    expect(practice.normalizeCompanionProblem({ name: 'bad', url: 'javascript:alert(1)' })).toBe(
      null,
    );
  });

  test('imports, deduplicates, updates and deletes problems', () => {
    const created = practice.importPracticeProblem(payload, 1000);
    expect(created).toMatchObject({
      name: 'A. Watermelon',
      status: 'inbox',
      createdAt: 1000,
    });
    expect(practice.listPracticeProblems()).toHaveLength(1);

    const duplicate = practice.importPracticeProblem(
      { ...payload, tests: [{ input: '4\n', output: 'NO\n' }] },
      2000,
    );
    expect(duplicate?.id).toBe(created?.id);
    expect(duplicate?.samples).toEqual([{ input: '4\n', output: 'NO\n' }]);
    expect(practice.listPracticeProblems()).toHaveLength(1);

    const practicing = practice.updatePracticeProblem(
      created!.id,
      { status: 'practicing', notes: 'math' },
      3000,
    );
    expect(practicing).toMatchObject({ status: 'practicing', notes: 'math', startedAt: 3000 });

    const review = practice.updatePracticeProblem(created!.id, { status: 'review' }, 4000);
    expect(review?.reviewAt).toBe(4000 + 24 * 60 * 60 * 1000);

    const solved = practice.updatePracticeProblem(created!.id, { status: 'solved' }, 5000);
    expect(solved).toMatchObject({ status: 'solved', solvedAt: 5000 });
    expect(solved?.reviewAt).toBeUndefined();

    expect(practice.deletePracticeProblem(created!.id)).toBe(true);
    expect(practice.deletePracticeProblem('missing')).toBe(false);
    expect(practice.listPracticeProblems()).toEqual([]);
  });
});
