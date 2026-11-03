import { createHash } from 'node:crypto';
import type {
  PracticeProblem,
  PracticeProblemUpdate,
  PracticeSample,
  PracticeStatus,
} from '../../shared/types';
import { store } from '../store';
import { isSafeExternalUrl } from './url-security';

const MAX_PROBLEMS = 1000;
const MAX_SAMPLES = 50;
const MAX_SAMPLE_CHARS = 250_000;
const MAX_NOTES_CHARS = 20_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CompanionProblemData {
  name: string;
  group: string;
  url: string;
  source: string;
  samples: PracticeSample[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clampText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function optionalPositiveNumber(value: unknown, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max
    ? value
    : undefined;
}

export function derivePracticeSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const labels: Array<[RegExp, string]> = [
      [/(^|\.)codeforces\.com$/i, 'Codeforces'],
      [/(^|\.)atcoder\.jp$/i, 'AtCoder'],
      [/(^|\.)leetcode\.(cn|com)$/i, 'LeetCode'],
      [/(^|\.)luogu\.com(\.cn)?$/i, 'Luogu'],
      [/(^|\.)nowcoder\.com$/i, 'Nowcoder'],
      [/(^|\.)qoj\.ac$/i, 'QOJ'],
      [/(^|\.)vjudge\.net$/i, 'VJudge'],
      [/(^|\.)lanqiao\.cn$/i, 'Lanqiao'],
    ];
    return labels.find(([pattern]) => pattern.test(hostname))?.[1] ?? hostname;
  } catch {
    return '';
  }
}

export function normalizeCompanionProblem(payload: unknown): CompanionProblemData | null {
  const record = toRecord(payload);
  if (!record || typeof record.name !== 'string' || !isSafeExternalUrl(record.url)) {
    return null;
  }
  const name = record.name.trim();
  if (!name) return null;

  const rawTests = Array.isArray(record.tests) ? record.tests.slice(0, MAX_SAMPLES) : [];
  const samples = rawTests.flatMap(item => {
    const test = toRecord(item);
    if (!test) return [];
    return [
      {
        input: clampText(test.input, MAX_SAMPLE_CHARS),
        output: clampText(test.output, MAX_SAMPLE_CHARS),
      },
    ];
  });

  return {
    name: clampText(name, 240),
    group: clampText(record.group, 240),
    url: record.url,
    source: derivePracticeSource(record.url),
    samples,
    timeLimitMs: optionalPositiveNumber(record.timeLimit, 120_000),
    memoryLimitMb: optionalPositiveNumber(record.memoryLimit, 4096),
  };
}

export function createPracticeProblemId(data: CompanionProblemData): string {
  return createHash('sha1')
    .update(`${data.url}\u0000${data.name}\u0000${data.group}`)
    .digest('hex')
    .slice(0, 16);
}

function readProblems(): PracticeProblem[] {
  const stored = store.get('practice.problems');
  return Array.isArray(stored) ? (stored as PracticeProblem[]) : [];
}

function writeProblems(problems: PracticeProblem[]): void {
  store.set('practice.problems', problems.slice(0, MAX_PROBLEMS));
}

export function listPracticeProblems(): PracticeProblem[] {
  return readProblems()
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function importPracticeProblem(payload: unknown, now = Date.now()): PracticeProblem | null {
  const data = normalizeCompanionProblem(payload);
  if (!data) return null;
  const problems = readProblems();
  const id = createPracticeProblemId(data);
  const existing = problems.find(problem => problem.id === id);
  const next: PracticeProblem = existing
    ? {
        ...existing,
        name: data.name,
        group: data.group,
        url: data.url,
        source: data.source,
        samples: data.samples,
        timeLimitMs: data.timeLimitMs,
        memoryLimitMb: data.memoryLimitMb,
        updatedAt: now,
      }
    : {
        id,
        name: data.name,
        group: data.group,
        url: data.url,
        source: data.source,
        status: 'inbox',
        notes: '',
        samples: data.samples,
        timeLimitMs: data.timeLimitMs,
        memoryLimitMb: data.memoryLimitMb,
        createdAt: now,
        updatedAt: now,
      };

  const nextProblems = existing
    ? problems.map(problem => (problem.id === id ? next : problem))
    : [next, ...problems];
  writeProblems(nextProblems);
  return next;
}

function isPracticeStatus(value: unknown): value is PracticeStatus {
  return value === 'inbox' || value === 'practicing' || value === 'review' || value === 'solved';
}

export function updatePracticeProblem(
  id: string,
  updates: PracticeProblemUpdate,
  now = Date.now(),
): PracticeProblem | null {
  const problems = readProblems();
  const index = problems.findIndex(problem => problem.id === id);
  if (index < 0) return null;
  const current = problems[index];
  const next: PracticeProblem = {
    ...current,
    notes:
      typeof updates.notes === 'string' ? clampText(updates.notes, MAX_NOTES_CHARS) : current.notes,
    updatedAt: now,
  };

  if (isPracticeStatus(updates.status)) {
    next.status = updates.status;
    if (updates.status === 'practicing' && !next.startedAt) next.startedAt = now;
    if (updates.status === 'solved') {
      next.solvedAt = now;
      next.reviewAt = undefined;
    } else if (updates.status === 'review') {
      next.reviewAt = current.reviewAt ?? now + DAY_MS;
    } else if (updates.status === 'inbox') {
      next.reviewAt = undefined;
    }
  }

  if (updates.reviewAt === null) {
    next.reviewAt = undefined;
  } else if (typeof updates.reviewAt === 'number' && Number.isFinite(updates.reviewAt)) {
    next.reviewAt = updates.reviewAt;
  }

  problems[index] = next;
  writeProblems(problems);
  return next;
}

export function deletePracticeProblem(id: string): boolean {
  const problems = readProblems();
  const next = problems.filter(problem => problem.id !== id);
  if (next.length === problems.length) return false;
  writeProblems(next);
  return true;
}

export function clearPracticeProblems(): void {
  writeProblems([]);
}
