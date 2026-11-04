import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { VirtualContestDialog } from '../../src/components/contest/VirtualContestDialog';
import { createContest, flushPromises, installDom } from './helpers';
import { click, findButton, render } from './react-helpers';
import { resetFrontendStores } from './page-fixtures';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  resetFrontendStores();
});

describe('Virtual contest timer', () => {
  test('starts, pauses and persists a virtual contest timer', async () => {
    const contest = createContest('Past Round', Math.floor(Date.now() / 1000) - 7200);
    const view = await render(<VirtualContestDialog contest={contest} onClose={() => {}} />);
    expect(view.container.textContent).toContain('虚拟参赛计时器');

    await click(findButton(view.container, '开始 VP'));
    const key = `ojflow_vp_timer_${contest.name}_${contest.startTimeSeconds}`;
    const running = JSON.parse(localStorage.getItem(key) ?? '{}') as {
      running: boolean;
      startedAt: number | null;
    };
    expect(running.running).toBe(true);
    expect(typeof running.startedAt).toBe('number');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    await click(findButton(view.container, '暂停'));
    await act(async () => {
      await flushPromises();
    });
    const paused = JSON.parse(localStorage.getItem(key) ?? '{}') as {
      running: boolean;
      accumulatedMs: number;
    };
    expect(paused.running).toBe(false);
    expect(paused.accumulatedMs).toBeGreaterThanOrEqual(0);
    await view.unmount();
  });
});
