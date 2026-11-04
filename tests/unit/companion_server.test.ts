import { describe, expect, mock, test } from 'bun:test';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
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

const { createCompanionRequestHandler } = await import('../../electron/services/companion-server');

class FakeResponse {
  status = 0;
  headers: Record<string, string> = {};
  body = '';

  writeHead(status: number, headers: Record<string, string>) {
    this.status = status;
    this.headers = headers;
    return this;
  }

  end(body?: string) {
    this.body = body ?? '';
  }
}

function createRequest(method: string, payload?: unknown): IncomingMessage {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  const request = Readable.from(body ? [Buffer.from(body)] : []) as IncomingMessage;
  request.method = method;
  return request;
}

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
      code: '',
      codeLanguage: 'cpp',
      samples: [{ input: '1', output: '2' }],
      createdAt: 1,
      updatedAt: 1,
    };
    const handler = createCompanionRequestHandler(
      item => imported.push(item),
      payload => ((payload as { name?: string }).name === 'A. Test' ? problem : null),
    );

    const ready = new FakeResponse();
    await handler(createRequest('GET'), ready as unknown as ServerResponse);
    expect(ready.status).toBe(200);
    expect(JSON.parse(ready.body)).toMatchObject({ name: 'OJFlow', ready: true });

    const accepted = new FakeResponse();
    await handler(
      createRequest('POST', { name: 'A. Test' }),
      accepted as unknown as ServerResponse,
    );
    expect(accepted.status).toBe(200);
    expect(JSON.parse(accepted.body)).toEqual({ status: 'ok', id: 'problem-1' });
    expect(imported).toEqual([problem]);

    const invalid = new FakeResponse();
    await handler(createRequest('POST', { name: 'bad' }), invalid as unknown as ServerResponse);
    expect(invalid.status).toBe(400);

    const unsupported = new FakeResponse();
    await handler(createRequest('PUT'), unsupported as unknown as ServerResponse);
    expect(unsupported.status).toBe(405);

    const options = new FakeResponse();
    await handler(createRequest('OPTIONS'), options as unknown as ServerResponse);
    expect(options.status).toBe(204);
  });
});
