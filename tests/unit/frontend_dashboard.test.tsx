import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import DashboardPage from '../../src/views/DashboardPage';
import { useContestStore } from '../../src/stores/contest';
import { useScheduleStore } from '../../src/stores/schedule';
import { createContest, flushPromises, installDom } from './helpers';
import { click, findButton, render, type, waitFor } from './react-helpers';
import { installWindowApi, installWindowStore, resetFrontendStores } from './page-fixtures';

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
  installWindowApi({
    getRating: async (_platform, name) => ({
      name,
      curRating: 1234,
      maxRating: 1600,
    }),
    getSolvedNum: async (_platform, name) => ({ name, solvedNum: 100 }),
    getCodeforcesReport: async handle => ({
      handle,
      totalSolved: 100,
      ratingStats: [{ rating: 1200, count: 20 }],
      tagStats: [
        { tag: 'dp', count: 18 },
        { tag: 'graphs', count: 12 },
      ],
    }),
  });
  resetFrontendStores();
  localStorage.clear();
  localStorage.setItem('rating_username_Codeforces', 'tourist');
  localStorage.setItem('solved_usernames', JSON.stringify({ Codeforces: 'tourist' }));
  useContestStore.setState({
    contests: [createContest('Bento Round', Math.floor(Date.now() / 1000) + 7200)],
  });
});

describe('Dashboard page', () => {
  test('renders aggregated data and manages schedules', async () => {
    const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
      initialEntries: ['/dashboard'],
    });
    const view = await render(<RouterProvider router={router} />);
    await waitFor(() => view.container.textContent?.includes('1234') ?? false);

    expect(view.container.textContent).toContain('数据工作台');
    expect(view.container.textContent).toContain('Bento Round');
    expect(view.container.textContent).toContain('100');
    expect(view.container.textContent).toContain('动态规划');
    expect(view.container.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      '100',
    );

    await click(findButton(view.container, '添加日程'));
    await type(
      view.container.querySelector('input[placeholder="日程标题"]') as HTMLInputElement,
      'DP practice',
    );
    await click(findButton(view.container, '保存'));
    await act(async () => {
      await flushPromises();
    });
    expect(useScheduleStore.getState().items[0].title).toBe('DP practice');
    expect(view.container.textContent).toContain('DP practice');
    await view.unmount();
  });

  test('shows schedule platform logos, opens contests, and previews a share poster', async () => {
    const openedUrls: string[] = [];
    installWindowApi({
      getRating: async (_platform, name) => ({
        name,
        curRating: 1234,
        maxRating: 1600,
      }),
      getSolvedNum: async (_platform, name) => ({ name, solvedNum: 100 }),
      getCodeforcesReport: async handle => ({
        handle,
        totalSolved: 100,
        ratingStats: [{ rating: 1200, count: 20 }],
        tagStats: [{ tag: 'dp', count: 18 }],
      }),
      openUrl: async url => {
        openedUrls.push(url);
      },
    });
    useScheduleStore.setState({
      items: [
        {
          id: 'linked',
          title: 'Linked CF Round',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          durationMinutes: 120,
          kind: 'contest',
          completed: false,
          createdAt: 1,
          autoCreated: true,
          platform: 'Codeforces',
          url: 'https://codeforces.com/contest/1',
        },
      ],
      initialized: true,
    });
    const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
      initialEntries: ['/dashboard'],
    });
    const view = await render(<RouterProvider router={router} />);
    await waitFor(() => view.container.textContent?.includes('1234') ?? false);

    expect(view.container.querySelector('img[alt="Codeforces"]')).not.toBeNull();
    await click(view.container.querySelector('[aria-label="标记完成"]'));
    expect(useScheduleStore.getState().items[0].completed).toBe(true);
    await click(findButton(view.container, 'Linked CF Round'));
    expect(openedUrls).toContain('https://codeforces.com/contest/1');

    await click(findButton(view.container, '分享训练成果'));
    const preview = view.container.querySelector('[data-testid="share-poster-preview"]');
    const lightSrc = preview?.getAttribute('src');
    expect(lightSrc?.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(lightSrc?.split(',')[1] ?? '')).toContain('#f7f1e6');
    await click(findButton(view.container, '深色数据'));
    expect(
      view.container.querySelector('[data-testid="share-poster-preview"]')?.getAttribute('src'),
    ).not.toBe(lightSrc);
    await view.unmount();
  });
});
