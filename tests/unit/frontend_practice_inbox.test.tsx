import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import type { PracticeProblem } from '../../shared/types';
import { installDom, flushPromises } from './helpers';
import { click, findButton, render, type, waitFor } from './react-helpers';
import { installWindowApi, installWindowStore, resetFrontendStores } from './page-fixtures';
import PracticeInboxPage from '../../src/views/PracticeInboxPage';

let dom: ReturnType<typeof installDom>;

const problem: PracticeProblem = {
  id: 'p1',
  name: 'A. Watermelon',
  group: 'Codeforces Round 1',
  url: 'https://codeforces.com/contest/4/problem/A',
  source: 'Codeforces',
  status: 'inbox',
  notes: '',
  code: '',
  codeLanguage: 'cpp',
  samples: [{ input: '8\n', output: 'YES\n' }],
  timeLimitMs: 1000,
  memoryLimitMb: 256,
  createdAt: 1,
  updatedAt: 1,
};

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  installWindowStore();
  installWindowApi();
  resetFrontendStores();
  window.confirm = () => true;
});

describe('Practice Inbox page', () => {
  test('restores imported problems, changes status, saves notes and copies samples', async () => {
    const updates: Array<{ id: string; updates: unknown }> = [];
    const copied: string[] = [];
    installWindowApi({
      listPracticeProblems: async () => [problem],
      getCompanionStatus: async () => ({ running: true, port: 10043 }),
      updatePracticeProblem: async (id, next) => {
        updates.push({ id, updates: next });
        return { ...problem, ...next, reviewAt: next.reviewAt ?? undefined, updatedAt: 2 };
      },
      copyText: async text => {
        copied.push(text);
      },
    });

    const view = await render(<PracticeInboxPage />);
    await waitFor(() => view.container.textContent?.includes('A. Watermelon') ?? false);
    expect(view.container.textContent).toContain('Companion 已连接');
    expect(view.container.textContent).toContain('YES');

    await click(findButton(view.container, '开始练习'));
    await act(async () => {
      await flushPromises();
    });
    expect(updates).toContainEqual({ id: 'p1', updates: { status: 'practicing' } });

    const notes = view.container.querySelector(
      'textarea[aria-label="练习笔记"]',
    ) as HTMLTextAreaElement;
    await type(notes, 'Use parity');
    await click(findButton(view.container, '保存笔记'));
    await act(async () => {
      await flushPromises();
    });
    expect(updates).toContainEqual({ id: 'p1', updates: { notes: 'Use parity' } });

    expect(view.container.querySelector('[data-testid="practice-code-editor"]')).not.toBeNull();

    const sampleCopy = Array.from(view.container.querySelectorAll('button')).find(
      button => button.textContent?.trim() === '复制',
    );
    await click(sampleCopy ?? null);
    expect(copied.some(value => value.includes('8\n') && value.includes('YES\n'))).toBe(true);
    await view.unmount();
  });

  test('adds problems pushed by the Companion receiver', async () => {
    let onImported: ((next: PracticeProblem) => void) | undefined;
    installWindowApi({
      listPracticeProblems: async () => [],
      getCompanionStatus: async () => ({ running: true, port: 10043 }),
      onPracticeImported: callback => {
        onImported = callback;
        return () => {};
      },
    });
    const view = await render(<PracticeInboxPage />);
    await waitFor(() => view.container.textContent?.includes('还没有导入题目') ?? false);

    await act(async () => {
      onImported?.({ ...problem, id: 'p2', name: 'B. Imported' });
      await flushPromises();
    });
    expect(view.container.textContent).toContain('B. Imported');
    await view.unmount();
  });

  test('adds a problem manually with an optional sample', async () => {
    const created: PracticeProblem = {
      ...problem,
      id: 'manual',
      name: 'C. Manual',
      group: 'Local contest',
      url: 'https://codeforces.com/contest/9/problem/C',
    };
    installWindowApi({
      listPracticeProblems: async () => [],
      getCompanionStatus: async () => ({ running: true, port: 10043 }),
      createPracticeProblem: async () => created,
    });
    const view = await render(<PracticeInboxPage />);
    await waitFor(() => view.container.textContent?.includes('还没有导入题目') ?? false);

    await click(findButton(view.container, '手动添加题目'));
    await type(
      view.container.querySelector('input[aria-label="题目名称"]') as HTMLInputElement,
      'C. Manual',
    );
    await type(
      view.container.querySelector('input[aria-label="题目链接"]') as HTMLInputElement,
      'https://codeforces.com/contest/9/problem/C',
    );
    await type(
      view.container.querySelector('input[aria-label="比赛或来源"]') as HTMLInputElement,
      'Local contest',
    );
    await click(findButton(view.container, '保存'));
    await act(async () => {
      await flushPromises();
    });
    expect(view.container.textContent).toContain('C. Manual');
    await view.unmount();
  });
});
