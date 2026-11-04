import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import SchedulePage from '../../src/views/SchedulePage';
import { useScheduleStore } from '../../src/stores/schedule';
import { flushPromises, installDom } from './helpers';
import { click, findButton, render } from './react-helpers';
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
  localStorage.clear();
  installWindowStore();
  installWindowApi();
  resetFrontendStores();
  window.confirm = () => true;
});

describe('Schedule page', () => {
  test('shows today by default and cleans expired schedules', async () => {
    useScheduleStore.setState({
      items: [
        {
          id: 'today',
          title: 'Today practice',
          startsAt: new Date().toISOString(),
          durationMinutes: 60,
          kind: 'practice',
          completed: false,
          createdAt: 1,
        },
        {
          id: 'expired',
          title: 'Expired review',
          startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 30,
          kind: 'review',
          completed: false,
          createdAt: 1,
        },
      ],
      initialized: true,
    });

    const view = await render(<SchedulePage />);
    expect(view.container.textContent).toContain('Today practice');
    expect(view.container.textContent).not.toContain('Expired review');

    await click(findButton(view.container, '已过期'));
    expect(view.container.textContent).toContain('Expired review');

    await click(findButton(view.container, '清理过期日程'));
    await act(async () => {
      await flushPromises();
    });
    expect(useScheduleStore.getState().items.map(item => item.id)).toEqual(['today']);
    await view.unmount();
  });
});
