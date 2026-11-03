import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { PracticeProblem } from '../../shared/types';

class FakeElectronStore {
  private data: Record<string, unknown> = {};
  get(key: string): unknown {
    return this.data[key];
  }
  set(key: string, value: unknown): void {
    this.data[key] = value;
  }
}

mock.module('electron-store', () => ({ default: FakeElectronStore }));

const { startCompanionServer } = await import('../../electron/services/companion-server');

let closeServer: (() => Promise<void>) | undefined;

afterEach(async () => {
  if (closeServer) await closeServer();
  closeServer = undefined;
});

describe('Competitive Companion receiver', () => {
  test('accepts problem payloads and reports invalid requests', async () => {
    const imported: PracticeProblem[] = [];
    const problem: PracticeProblem = {
      id: 'problem-1',
      name: 'A. Test',
      group: 'Round',
      url: 'https://codeforces.com/contest/1/problem/A',
      source: 'Codeforces',
      status: 'inbox',
      notes: '',
      samples: [{ input: '1', output: '2' }],
      createdAt: 1,
      updatedAt: 1,
    };
    const server = await startCompanionServer({
      ports: [0],
      importProblem: payload =>
        (payload as { name?: string }).name === 'A. Test' ? problem : null,
      onImported: item => imported.push(item),
    });
    closeServer = server.close;

    const ready = await fetch(`http://127.0.0.1:${server.port}`);
    expect(ready.status).toBe(200);
    expect(await ready.json()).toMatchObject({ name: 'OJFlow', ready: true });

    const accepted = await fetch(`http://127.0.0.1:${server.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A. Test' }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ status: 'ok', id: 'problem-1' });
    expect(imported).toEqual([problem]);

    const invalid = await fetch(`http://127.0.0.1:${server.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bad' }),
    });
    expect(invalid.status).toBe(400);

    const unsupported = await fetch(`http://127.0.0.1:${server.port}`, { method: 'PUT' });
    expect(unsupported.status).toBe(405);
  });
});
