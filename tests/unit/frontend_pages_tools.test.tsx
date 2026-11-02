import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { installDom, flushPromises } from './helpers';
import { click, findButton, render, type, waitFor } from './react-helpers';
import { installWindowApi, installWindowStore, resetFrontendStores } from './page-fixtures';
import ProblemsPage from '../../src/views/ProblemsPage';
import RatingPage from '../../src/views/RatingPage';
import SolvedNumPage from '../../src/views/SolvedNumPage';
import CfpReportPage from '../../src/views/CfpReportPage';
import CcpPage from '../../src/views/CcpPage';
import OierPage from '../../src/views/OierPage';
import { useUiStore } from '../../src/stores/ui';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  document.body.innerHTML = '';
  installWindowStore();
  installWindowApi();
  resetFrontendStores();
});

describe('Problems page', () => {
  test('loads, filters, paginates and opens a problem', async () => {
    const requests: Array<{ query?: string; page?: number; platform?: string; tag?: string }> = [];
    const opened: string[] = [];
    installWindowApi({
      searchProblems: async request => {
        requests.push(request);
        return {
          problems: [
            {
              id: 'Codeforces:1-A',
              platform: 'Codeforces',
              contestId: 1,
              index: 'A',
              name: request.query ? `Result ${request.query}` : 'Watermelon',
              rating: 800,
              tags: ['implementation'],
              url: 'https://codeforces.com/problemset/problem/1/A',
            },
          ],
          total: 120,
          page: request.page ?? 1,
          pageSize: 60,
          sources: [
            { platform: 'Codeforces', success: true, count: 120 },
            { platform: 'QOJ', success: false, count: 0, error: 'offline' },
          ],
        };
      },
      openUrl: async url => {
        opened.push(url);
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={client}>
        <ProblemsPage />
      </QueryClientProvider>,
    );
    await act(async () => {
      await flushPromises();
    });
    expect(view.container.textContent).toContain('Problem Atlas');
    expect(view.container.textContent).toContain('Watermelon');
    expect(view.container.textContent).toContain('部分平台暂不可用');

    await click(findButton(view.container, '力扣'));
    await click(findButton(view.container, '动态规划'));
    await act(async () => {
      await flushPromises();
    });
    expect(requests.some(request => request.platform === '力扣')).toBe(true);
    expect(requests.some(request => request.tag === 'dp')).toBe(true);

    await act(async () => {
      useUiStore.setState({ locale: 'en-US', effectiveLocale: 'en-US' });
      await flushPromises();
    });
    expect(view.container.textContent).toContain('Dynamic Programming');

    await type(
      view.container.querySelector('input[placeholder*="Search problem"]') as HTMLInputElement,
      'graph',
    );
    await click(findButton(view.container, 'Apply'));
    await act(async () => {
      await flushPromises();
    });
    expect(requests.some(request => request.query === 'graph')).toBe(true);
    expect(view.container.textContent).toContain('Result graph');

    await click(findButton(view.container, 'Next'));
    await act(async () => {
      await flushPromises();
    });
    expect(requests.some(request => request.page === 2)).toBe(true);

    await click(view.container.querySelector('[aria-label^="Open problem"]'));
    expect(opened).toContain('https://codeforces.com/problemset/problem/1/A');
    await view.unmount();
  });

  test('shows a retry action on API failure', async () => {
    let calls = 0;
    installWindowApi({
      searchProblems: async () => {
        calls++;
        throw new Error('network failed');
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={client}>
        <ProblemsPage />
      </QueryClientProvider>,
    );
    await waitFor(() => view.container.textContent?.includes('题库加载失败') ?? false);
    expect(view.container.textContent).toContain('题库加载失败');
    await click(findButton(view.container, '重试'));
    await waitFor(() => calls >= 2);
    expect(calls).toBeGreaterThanOrEqual(2);
    await view.unmount();
  });
});

describe('Rating page', () => {
  test('queries and persists a username', async () => {
    installWindowApi({
      getRating: async () => ({ name: 'tourist', curRating: 2000, maxRating: 2200 }),
    });
    const view = await render(<RatingPage />);
    await type(
      view.container.querySelector('input[placeholder="输入用户名..."]') as HTMLInputElement,
      'tourist',
    );
    await click(findButton(view.container, '查询'));
    await act(async () => {
      await flushPromises();
    });
    expect(view.container.textContent).toContain('2000');
    expect(view.container.textContent).toContain('Expert');
    expect(localStorage.getItem('rating_username_Codeforces')).toBe('tourist');
    await view.unmount();
  });

  test('renders query errors', async () => {
    installWindowApi({
      getRating: async () => {
        throw new Error('user not found');
      },
    });
    const view = await render(<RatingPage />);
    await type(
      view.container.querySelector('input[placeholder="输入用户名..."]') as HTMLInputElement,
      'missing',
    );
    await click(findButton(view.container, '查询'));
    await act(async () => {
      await flushPromises();
    });
    expect(view.container.textContent).toContain('user not found');
    await view.unmount();
  });
});

describe('Solved count page', () => {
  test('queries multiple users and opens the platform library', async () => {
    const opened: string[] = [];
    const queried: string[] = [];
    installWindowApi({
      getSolvedNum: async (_platform, name) => {
        queried.push(name);
        return { name, solvedNum: name === 'a' ? 30 : 12 };
      },
      openUrl: async url => {
        opened.push(url);
      },
    });
    const view = await render(<SolvedNumPage />);
    await type(
      view.container.querySelector('input[placeholder="用户名"]') as HTMLInputElement,
      'a;b',
    );
    await click(view.container.querySelector('[aria-label="刷新 Codeforces"]'));
    await act(async () => {
      await flushPromises();
    });
    expect(queried).toEqual(['a', 'b']);
    expect(view.container.textContent).toContain('42');
    await click(view.container.querySelector('[aria-label="打开 Codeforces 题库"]'));
    expect(opened).toContain('https://codeforces.com/problemset');
    await view.unmount();
  });
});

describe('Codeforces report page', () => {
  test('renders report data and errors', async () => {
    installWindowApi({
      getCodeforcesReport: async handle => ({
        handle,
        totalSolved: 42,
        ratingStats: [{ rating: 800, count: 10 }],
        tagStats: [{ tag: 'dp', count: 8 }],
      }),
    });
    const view = await render(<CfpReportPage />);
    await type(
      view.container.querySelector(
        'input[placeholder="输入 Codeforces Handle..."]',
      ) as HTMLInputElement,
      'tourist',
    );
    await click(findButton(view.container, '生成报告'));
    await act(async () => {
      await flushPromises();
    });
    expect(view.container.textContent).toContain('42');
    expect(view.container.textContent).toContain('动态规划 (8)');
    await view.unmount();

    installWindowApi({
      getCodeforcesReport: async () => {
        throw new Error('report failed');
      },
    });
    const errorView = await render(<CfpReportPage />);
    await type(
      errorView.container.querySelector(
        'input[placeholder="输入 Codeforces Handle..."]',
      ) as HTMLInputElement,
      'missing',
    );
    await click(findButton(errorView.container, '生成报告'));
    await act(async () => {
      await flushPromises();
    });
    expect(errorView.container.textContent).toContain('report failed');
    await errorView.unmount();
  });
});

describe('external tool pages', () => {
  test('CCPC and OIER buttons open their services', async () => {
    const opened: string[] = [];
    installWindowApi({
      openUrl: async url => {
        opened.push(url);
      },
    });
    const ccp = await render(<CcpPage />);
    await click(findButton(ccp.container, '在浏览器中打开 CPCFinder'));
    await ccp.unmount();

    const oier = await render(<OierPage />);
    await click(findButton(oier.container, '在浏览器中打开 OIerDB'));
    await oier.unmount();
    expect(opened).toEqual(['https://cpcfinder.com/', 'https://oier.baoshuo.dev/']);
  });
});
