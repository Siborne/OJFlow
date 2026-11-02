import type { ReactElement } from 'react';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

export interface RenderResult {
  container: HTMLElement;
  root: Root;
  unmount: () => Promise<void>;
}

export async function render(element: ReactElement): Promise<RenderResult> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    root,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export async function click(element: Element | null): Promise<void> {
  if (!element) throw new Error('Element not found');
  await act(async () => {
    (element as HTMLElement).click();
  });
}

export async function type(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    Simulate.change(input, { target: { value } } as never);
  });
}

export function findButton(container: ParentNode, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const button = buttons.find(
    item =>
      item.textContent?.includes(text) ||
      item.getAttribute('aria-label')?.includes(text) ||
      item.getAttribute('title')?.includes(text),
  );
  if (!button) throw new Error(`Button not found: ${text}`);
  return button as HTMLButtonElement;
}

export async function waitFor(predicate: () => boolean, timeoutMs = 1200): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
  if (!predicate()) throw new Error('waitFor timeout');
}
