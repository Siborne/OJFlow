import { describe, expect, test } from 'bun:test';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import NavigationPage from '../../src/views/NavigationPage.vue';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
}

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

(hasDom ? describe : describe.skip)('Navigation responsive', () => {
  test('320px 宽度下底部导航固定可见', async () => {
    setViewport(320, 800);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/contest', component: { template: '<div />' } }],
    });
    await router.push('/contest');
    await router.isReady();

    const wrapper = mount(NavigationPage, {
      global: {
        plugins: [router],
        stubs: {
          'router-view': { template: '<div class="router-view-stub" />' },
          'n-layout': { template: '<div class="n-layout"><slot /></div>' },
          'n-layout-sider': { template: '<aside class="n-layout-sider"><slot /></aside>' },
          'n-layout-content': { template: '<main class="n-layout-content"><slot /></main>' },
          'n-layout-footer': { template: '<footer class="n-layout-footer"><slot /></footer>' },
          'n-menu': { template: '<nav class="n-menu"></nav>' },
          'n-icon': { template: '<i class="n-icon"></i>' },
        },
      },
    });

    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.find('.mobile-footer').exists()).toBe(true);
    expect(wrapper.find('.bottom-nav').exists()).toBe(true);
  });
});
