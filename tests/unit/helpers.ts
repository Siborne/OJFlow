import { Window } from 'happy-dom';
import type { Contest } from '../../src/types';

export function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

export function createContest(name: string, startTimeSeconds: number): Contest {
  return {
    name,
    startTime: '2026-01-01 00:00',
    endTime: '2026-01-01 01:00',
    duration: '1 小时 0 分钟',
    platform: 'Codeforces',
    link: `https://example.com/${encodeURIComponent(name)}`,
    startHourMinute: '00:00',
    endHourMinute: '01:00',
    startTimeSeconds,
    durationSeconds: 3600,
    formattedStartTime: '2026-01-01 00:00',
    formattedEndTime: '2026-01-01 01:00',
    formattedDuration: '1 小时 0 分钟',
  };
}

export function installDom(): Window {
  const win = new Window({ url: 'https://ojflow.test/' });
  win.document.body.innerHTML = '<div id="app"></div>';
  const globals = globalThis as typeof globalThis & Record<string, unknown>;

  for (const key of [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLButtonElement',
    'HTMLSelectElement',
    'Node',
    'Event',
    'KeyboardEvent',
    'MouseEvent',
    'CustomEvent',
    'localStorage',
    'navigator',
  ]) {
    Object.defineProperty(globalThis, key, {
      value: key === 'window' ? win : key === 'document' ? win.document : win[key as keyof Window],
      configurable: true,
      writable: true,
    });
  }

  Object.defineProperty(win, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  Object.assign(win, {
    confirm: () => true,
    scrollTo: () => {},
  });

  globals.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globals.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  globals.MutationObserver = class {
    takeRecords() {
      return [];
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof MutationObserver;
  globals.requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  globals.cancelAnimationFrame = (id: number) => clearTimeout(id);
  globals.IS_REACT_ACT_ENVIRONMENT = true;

  Object.defineProperty(win.HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(win.HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(win.HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  });

  return win;
}

export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function textResponse(data: string, status = 200): Response {
  return new Response(data, { status });
}
