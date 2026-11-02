import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { installDom } from './helpers';
import { waitFor } from './react-helpers';
import { installWindowApi, installWindowStore } from './page-fixtures';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

describe('renderer entry point', () => {
  test('bootstraps migration and mounts the app root', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    installWindowStore();
    installWindowApi();
    window.location.hash = '#/contest';

    await act(async () => {
      await import('../../src/main');
    });
    await waitFor(() => Boolean(document.querySelector('#app .app-bar')));

    expect(document.querySelector('#app')?.textContent).toContain('近期比赛');
    expect(document.documentElement.dataset.mode).toBe('simple');
  });
});
