import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { WindowTitleBar } from '../../src/components/WindowTitleBar';
import { installDom } from './helpers';
import { click, render } from './react-helpers';
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
  resetFrontendStores();
});

describe('custom window title bar', () => {
  test('dispatches window actions and follows maximize state', async () => {
    const actions: string[] = [];
    let stateListener: ((state: { maximized: boolean }) => void) | null = null;
    installWindowApi({
      minimizeWindow: async () => {
        actions.push('minimize');
      },
      toggleMaximizeWindow: async () => {
        actions.push('maximize');
      },
      closeWindow: async () => {
        actions.push('close');
      },
      getWindowState: async () => ({ maximized: false }),
      onWindowStateChanged: callback => {
        stateListener = callback;
        return () => {
          stateListener = null;
        };
      },
    });

    const view = await render(<WindowTitleBar />);
    await click(view.container.querySelector('[aria-label="最小化"]'));
    await click(view.container.querySelector('[aria-label="最大化"]'));
    expect(actions).toEqual(['minimize', 'maximize']);

    await act(async () => {
      stateListener?.({ maximized: true });
    });
    expect(view.container.querySelector('[aria-label="还原窗口"]')).not.toBeNull();
    await click(view.container.querySelector('[aria-label="关闭"]'));
    expect(actions).toEqual(['minimize', 'maximize', 'close']);
    await view.unmount();
  });
});
