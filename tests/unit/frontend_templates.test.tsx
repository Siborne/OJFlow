import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import TemplatesPage from '../../src/views/TemplatesPage';
import { useTemplateStore } from '../../src/stores/templates';
import { flushPromises, installDom } from './helpers';
import { click, findButton, render, type } from './react-helpers';
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
  useTemplateStore.setState({ items: [], initialized: true });
});

describe('Templates page', () => {
  test('creates, searches, edits and copies a template', async () => {
    const copied: string[] = [];
    installWindowApi({
      copyText: async text => {
        copied.push(text);
      },
    });
    const view = await render(<TemplatesPage />);
    expect(view.container.textContent).toContain('还没有代码模板');

    await click(findButton(view.container, '新建模板'));
    await type(
      view.container.querySelector('input[aria-label="模板标题"]') as HTMLInputElement,
      'Segment tree',
    );
    await type(
      view.container.querySelector('input[aria-label="分类"]') as HTMLInputElement,
      'Data structures',
    );
    await type(
      view.container.querySelector('textarea[aria-label="模板内容"]') as HTMLTextAreaElement,
      'struct SegTree {};',
    );
    await click(findButton(view.container, '保存'));
    await act(async () => {
      await flushPromises();
    });

    expect(useTemplateStore.getState().items).toHaveLength(1);
    expect(view.container.textContent).toContain('Segment tree');
    expect(view.container.textContent).toContain('struct SegTree');

    await click(findButton(view.container, '复制模板'));
    expect(copied).toContain('struct SegTree {};');
    await view.unmount();
  });
});
