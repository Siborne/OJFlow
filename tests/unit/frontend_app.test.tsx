import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { installDom } from './helpers';
import { render, waitFor } from './react-helpers';
import { installWindowApi, installWindowStore, resetFrontendStores } from './page-fixtures';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  installWindowStore();
  installWindowApi();
  resetFrontendStores();
  window.location.hash = '#/contest';
});

describe('application shell', () => {
  test('router declares every user-facing route', async () => {
    const { router } = await import('../../src/router');
    const root = router.routes[0];
    expect(root.path).toBe('/');
    expect(root.children?.map(route => route.path).filter(Boolean)).toEqual([
      'dashboard',
      'contest',
      'star',
      'problems',
      'service',
      'setting',
      'rating',
      'solved_num',
      'archive',
      'ccpc',
      'oier',
      'cf_report',
    ]);
  });

  test('App initializes stores and renders a route', async () => {
    const { default: App } = await import('../../src/App');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    );
    await waitFor(() => Boolean(view.container.querySelector('.app-bar')));
    expect(view.container.querySelector('.app-bar')).not.toBeNull();
    expect(view.container.textContent).toContain('近期比赛');
    await view.unmount();
  });
});
