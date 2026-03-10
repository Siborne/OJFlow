import { test, expect, describe } from "bun:test";
import { mount } from "@vue/test-utils";
import SolvedNumPage from "../../src/views/SolvedNumPage.vue";
import StatsPanel from "../../src/components/StatsPanel.vue";

// Mock resize observer
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe.skip("SolvedNumPage Layout", () => {
  test("renders correct responsive grid cols", () => {
    const wrapper = mount(SolvedNumPage, {
      global: {
        stubs: {
          'n-button': { template: '<button><slot /></button>' },
          'n-icon': { template: '<i><slot /></i>' },
          'n-grid': {
            template: '<div class="n-grid" :cols="cols"><slot /></div>',
            props: ['cols']
          },
          'n-grid-item': { template: '<div class="n-grid-item"><slot /></div>' },
          'n-card': { template: '<div class="n-card"><slot /></div>' },
          'n-input': { template: '<input />' },
          'n-progress': { template: '<div class="n-progress"></div>' },
          StatsPanel: { template: '<div class="stats-panel-stub"></div>' }
        }
      }
    });

    const grid = wrapper.find('.n-grid');
    // Check if the cols prop matches the new requirement: 1 768:2 992:3
    expect(grid.attributes('cols')).toBe('1 768:2 992:3');
  });

  test("title should be 蓝桥云课", () => {
    const wrapper = mount(SolvedNumPage, {
        global: {
            stubs: {
                'n-button': { template: '<button><slot /></button>' },
                'n-icon': { template: '<i><slot /></i>' },
                'n-grid': { template: '<div class="n-grid"><slot /></div>' },
                'n-grid-item': { template: '<div class="n-grid-item"><slot /></div>' },
                'n-card': { template: '<div class="n-card"><slot /></div>' },
                'n-input': { template: '<input />' },
                'n-progress': { template: '<div class="n-progress"></div>' },
                StatsPanel: { template: '<div class="stats-panel-stub"></div>' }
            }
        }
    });
    expect(wrapper.find('.app-bar h2').text()).toBe('蓝桥云课');
  });
});

describe.skip("StatsPanel Component", () => {
  test("mobile mode class is applied when width < 992", async () => {
    // Mock window width
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
    });

    const wrapper = mount(StatsPanel, {
      props: {
        visible: true,
        data: []
      },
      global: {
        stubs: {
          'n-button': { template: '<button><slot /></button>' },
          'n-icon': { template: '<i><slot /></i>' }
        }
      }
    });

    // Trigger resize logic manually or wait for mount
    // The component checks on mount
    expect(wrapper.classes()).toContain('mobile-mode');
  });

  test("mobile mode class is NOT applied when width >= 992", async () => {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
    });

    const wrapper = mount(StatsPanel, {
      props: {
        visible: true,
        data: []
      },
      global: {
        stubs: {
          'n-button': { template: '<button><slot /></button>' },
          'n-icon': { template: '<i><slot /></i>' }
        }
      }
    });

    expect(wrapper.classes()).not.toContain('mobile-mode');
  });
});
