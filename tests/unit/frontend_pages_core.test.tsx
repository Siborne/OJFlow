import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { installDom, flushPromises, createContest } from './helpers';
import { click, findButton, render, type } from './react-helpers';
import { installWindowApi, installWindowStore, resetFrontendStores } from './page-fixtures';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import Contest from '../../src/views/Contest';
import Favorite from '../../src/views/Favorite';
import Settings from '../../src/views/Settings';
import ServicePage from '../../src/views/ServicePage';
import NavigationPage from '../../src/views/NavigationPage';
import { useContestStore } from '../../src/stores/contest';
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
  window.innerWidth = 1200;
  window.innerHeight = 800;
  window.confirm = () => true;
});

async function renderWithRouter(
  initialPath: string,
  routes: Parameters<typeof createMemoryRouter>[0],
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const view = await render(<RouterProvider router={router} />);
  await act(async () => {
    await flushPromises();
  });
  return { ...view, router };
}

describe('Contest page', () => {
  test('renders contests, filters, refreshes and switches tabs', async () => {
    let refreshCalls = 0;
    installWindowApi({
      getRecentContests: async () => {
        refreshCalls++;
        return {
          contests: [],
          platformStatus: [],
          totalElapsed: 0,
          fromCache: false,
          cachedAt: null,
        };
      },
    });
    useContestStore.setState({
      contests: [createContest('Round', Math.floor(Date.now() / 1000) + 3600)],
    });
    const view = await render(
      <TooltipProvider>
        <Contest />
      </TooltipProvider>,
    );
    expect(view.container.textContent).toContain('近期比赛');
    expect(view.container.textContent).toContain('Round');

    await click(view.container.querySelector('[aria-label="收藏比赛"]'));
    expect(useContestStore.getState().favorites).toHaveLength(1);
    const starred = view.container.querySelector('[aria-label="取消收藏"]');
    expect(starred?.getAttribute('aria-pressed')).toBe('true');
    expect(starred?.querySelector('svg')?.getAttribute('class')).toContain('fill-');

    await click(view.container.querySelector('[aria-label="筛选比赛"]'));
    expect(view.container.textContent).toContain('筛选平台');
    await click(findButton(view.container, '关闭'));

    const refreshCallsBefore = refreshCalls;
    await click(view.container.querySelector('[aria-label="刷新比赛"]'));
    await act(async () => {
      await flushPromises();
    });
    expect(refreshCalls).toBeGreaterThan(refreshCallsBefore);

    await click(findButton(view.container, '明天'));
    expect(view.container.textContent).toContain('当前范围内还没有比赛');
    expect(view.container.textContent).not.toContain('后天');
    await view.unmount();
  });

  test('simple mode hides quick stats and history', async () => {
    useUiStore.setState({ appMode: 'simple' });
    useContestStore.setState({
      contests: [createContest('Old', Math.floor(Date.now() / 1000) - 86400 * 3)],
    });
    const view = await render(
      <TooltipProvider>
        <Contest />
      </TooltipProvider>,
    );
    expect(view.container.textContent).not.toContain('比赛总览');
    expect(view.container.textContent).not.toContain('历史记录');
    await view.unmount();
  });

  test('keeps date tabs available while refreshing contests', async () => {
    useContestStore.setState({
      contests: [createContest('Loaded', Math.floor(Date.now() / 1000) + 3600)],
      loading: true,
    });
    const view = await render(
      <TooltipProvider>
        <Contest />
      </TooltipProvider>,
    );

    const tabs = view.container.querySelector('[data-testid="contest-date-tabs"]');
    expect(tabs).toBeTruthy();
    expect(tabs?.querySelectorAll('button')).toHaveLength(4);
    await view.unmount();
  });
});

describe('Favorite page', () => {
  test('supports batch selection, confirmation and deletion', async () => {
    useContestStore.setState({
      favorites: [createContest('A', Math.floor(Date.now() / 1000) + 3600), createContest('B', 2)],
    });
    const view = await render(<Favorite />);
    expect(view.container.textContent).toContain('收藏比赛');

    await click(view.container.querySelector('[data-testid="favorite-batch-toggle"]'));
    await click(view.container.querySelector('[data-testid="favorite-checkbox-A"]'));
    expect(view.container.textContent).toContain('已选 1 项');
    await click(view.container.querySelector('[data-testid="favorite-delete-selected"]'));
    const confirmButton = Array.from(view.container.querySelectorAll('button')).find(
      button => button.textContent?.trim() === '删除',
    );
    await click(confirmButton ?? null);
    expect(useContestStore.getState().favorites.map(item => item.name)).toEqual(['B']);
    expect(view.container.textContent).toContain('已删除 1 场收藏比赛');
    await view.unmount();
  });

  test('adds a manual contest through the dialog', async () => {
    const view = await render(<Favorite />);
    await click(view.container.querySelector('[aria-label="添加手动比赛"]'));
    const nameInput = view.container.querySelector(
      'input[placeholder="比赛名称"]',
    ) as HTMLInputElement;
    const startInput = view.container.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    await type(nameInput, 'Manual Round');
    await type(startInput, '2026-11-10T20:00');
    await click(findButton(view.container, '保存'));
    expect(useContestStore.getState().favorites[0].name).toBe('Manual Round');
    expect(useContestStore.getState().favorites[0].isManual).toBe(true);
    await view.unmount();
  });
});

describe('Settings page', () => {
  test('updates appearance, feature flags, preferences and cache', async () => {
    let cleared = 0;
    let autoLaunch = false;
    let templateShortcut = '';
    const storeWrites: Array<[string, unknown]> = [];
    installWindowApi({
      clearCache: async () => {
        cleared++;
      },
      setAutoLaunch: async enabled => {
        autoLaunch = enabled;
      },
      setShortcutSettings: async settings => {
        templateShortcut = settings.accelerator;
        return { success: true };
      },
    });
    installWindowStore({
      set: async (key, value) => {
        storeWrites.push([key, value]);
      },
    });
    const view = await render(<Settings />);
    expect(view.container.querySelector('[data-testid="settings-accent"]')?.textContent).toContain(
      '影响按钮、选中态、图标和统计卡片',
    );
    expect(view.container.querySelector('[data-testid="settings-accent"]')?.textContent).toContain(
      '墨影灰',
    );
    const accentSection = view.container.querySelector('[data-testid="settings-accent"]');
    const gradientSwatches = Array.from(accentSection?.querySelectorAll('span') ?? []).filter(
      element => element.getAttribute('style')?.includes('linear-gradient'),
    );
    expect(gradientSwatches).toHaveLength(7);
    expect(view.container.querySelector('nav[aria-label="设置中心"]')?.className).not.toContain(
      'overflow-x-auto',
    );

    await click(findButton(view.container, '完整模式'));
    await click(findButton(view.container, '暗色'));
    await click(findButton(view.container, '琥珀橙'));
    await click(findButton(view.container, '莓果红'));
    await click(findButton(view.container, '粘土'));
    await click(findButton(view.container, 'English'));
    expect(useUiStore.getState().appMode).toBe('full');
    expect(useUiStore.getState().colorMode).toBe('dark');
    expect(useUiStore.getState().themeScheme).toBe('berry');
    expect(useUiStore.getState().surfaceStyle).toBe('clay');
    expect(useUiStore.getState().locale).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');

    await click(findButton(view.container, '中文'));
    const sectionButton = findButton(view.container, '比赛偏好');
    await click(sectionButton);
    expect(sectionButton.getAttribute('aria-current')).toBe('location');

    await click(findButton(view.container, '功能开关'));
    const problemSwitch = view.container.querySelector('[aria-label="题目检索"]');
    await click(problemSwitch);
    expect(useUiStore.getState().features.enableProblemSearch).toBe(false);

    await click(findButton(view.container, '比赛偏好'));
    await click(findButton(view.container, '15 天'));
    await act(async () => {
      await flushPromises();
    });
    expect(useContestStore.getState().day).toBe(15);

    await click(findButton(view.container, '提醒与数据'));
    await click(view.container.querySelector('[aria-label="自动刷新"]'));
    expect(useUiStore.getState().autoRefresh.enabled).toBe(false);
    await click(view.container.querySelector('[aria-label="自动刷新"]'));
    const intervalSelect = view.container.querySelector(
      'select[aria-label="自动刷新间隔"]',
    ) as HTMLSelectElement;
    await act(async () => {
      intervalSelect.value = '30';
      intervalSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(useUiStore.getState().autoRefresh.intervalMinutes).toBe(30);
    await click(view.container.querySelector('[data-testid="settings-auto-refresh-dashboard"]'));
    expect(useUiStore.getState().autoRefresh.modules.dashboard).toBe(false);
    await click(view.container.querySelector('[data-testid="settings-share-poster-showTopics"]'));
    expect(useUiStore.getState().sharePoster.showTopics).toBe(false);

    await click(findButton(view.container, '清除查询缓存'));
    await act(async () => {
      await flushPromises();
    });
    expect(cleared).toBe(1);

    await click(findButton(view.container, '启动与窗口'));
    await click(view.container.querySelector('[aria-label="开机自动启动"]'));
    await click(view.container.querySelector('[aria-label="自动检查更新"]'));
    await click(findButton(view.container, '直接退出'));
    const shortcutButton = view.container.querySelector(
      '[aria-label="模板库全局快捷键"]',
    ) as HTMLButtonElement;
    await click(shortcutButton);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', altKey: true }));
      await flushPromises();
    });
    expect(autoLaunch).toBe(true);
    expect(templateShortcut).toBe('CommandOrControl+Shift+T');
    expect(useUiStore.getState().autoCheckUpdates).toBe(false);
    expect(storeWrites).toContainEqual(['ui.closeBehavior', 'quit']);
    await view.unmount();
  });
});

describe('Service page', () => {
  test('navigates to problem search and hides advanced tools in simple mode', async () => {
    const full = await renderWithRouter('/service', [
      { path: '/service', element: <ServicePage /> },
      { path: '/problems', element: <div>PROBLEMS ROUTE</div> },
    ]);
    expect(full.container.textContent).toContain('竞赛档案');
    const problemCard = Array.from(full.container.querySelectorAll('[role="button"]')).find(
      element => element.textContent?.includes('题目检索'),
    );
    await click(problemCard ?? null);
    await act(async () => {
      await flushPromises();
    });
    expect(full.container.textContent).toContain('PROBLEMS ROUTE');
    await full.unmount();

    useUiStore.setState({ appMode: 'simple' });
    const simple = await renderWithRouter('/service', [
      { path: '/service', element: <ServicePage /> },
    ]);
    expect(simple.container.textContent).toContain('题目检索');
    expect(simple.container.textContent).not.toContain('竞赛档案');
    expect(simple.container.textContent).not.toContain('CF 年度报告');
    await simple.unmount();
  });
});

describe('Navigation page', () => {
  test('switches routes, exposes full-mode item and supports shortcuts', async () => {
    const routes = [
      {
        path: '/',
        element: <NavigationPage />,
        children: [
          { path: 'dashboard', element: <div>DASHBOARD CONTENT</div> },
          { path: 'practice', element: <div>PRACTICE CONTENT</div> },
          { path: 'contest', element: <div>CONTEST CONTENT</div> },
          { path: 'schedule', element: <div>SCHEDULE CONTENT</div> },
          { path: 'templates', element: <div>TEMPLATES CONTENT</div> },
          { path: 'star', element: <div>STAR CONTENT</div> },
          { path: 'problems', element: <div>PROBLEMS CONTENT</div> },
          { path: 'service', element: <div>SERVICE CONTENT</div> },
          { path: 'setting', element: <div>SETTING CONTENT</div> },
        ],
      },
    ];

    useUiStore.setState({ appMode: 'simple' });
    const simple = await renderWithRouter('/contest', [...routes]);
    expect(simple.container.textContent).toContain('CONTEST CONTENT');
    expect(simple.container.textContent).not.toContain('PROBLEMS CONTENT');
    await click(findButton(simple.container, '设置'));
    await act(async () => {
      await flushPromises();
    });
    expect(simple.container.textContent).toContain('SETTING CONTENT');
    expect(
      simple.container.querySelector('[data-nav-key="settings"]')?.getAttribute('aria-current'),
    ).toBe('page');
    await simple.unmount();

    useUiStore.setState({ appMode: 'full' });
    const full = await renderWithRouter('/contest', [...routes]);
    expect(full.container.textContent).toContain('题目');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '4', ctrlKey: true }));
      await flushPromises();
    });
    expect(full.container.textContent).toContain('SCHEDULE CONTENT');
    await full.unmount();
  });
});
